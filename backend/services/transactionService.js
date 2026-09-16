const Income = require("../models/Income");
const Expense = require("../models/Expense");
const mongoose = require("mongoose");

const escapeRegex = (str) => String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

const getTransactionsByUser = async (userId, queryOptions = {}) => {
  const { search, type, category, startDate, endDate, sort, page = 1, limit = 10 } = queryOptions;

  const objectId = new mongoose.Types.ObjectId(userId);

  const dateMatch = {};
  if (startDate) dateMatch.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateMatch.$lte = end;
  }

  const expMatch = { userId: objectId };
  const incMatch = { userId: objectId };

  if (startDate || endDate) {
    expMatch.date = dateMatch;
    incMatch.date = dateMatch;
  }

  if (search && typeof search === "string") {
    const sRegex = new RegExp(escapeRegex(search), "i");
    expMatch.$or = [{ description: sRegex }, { category: sRegex }];
    incMatch.$or = [{ description: sRegex }, { source: sRegex }];
  }

  if (category && typeof category === "string" && category.toLowerCase() !== "all") {
    const cRegex = new RegExp(escapeRegex(category), "i");
    expMatch.category = cRegex;
    incMatch.source = cRegex;
  }

  const reqType = (type || "all").toLowerCase();
  let pipeline = [];

  if (reqType === "income") {
    pipeline = [
      { $match: incMatch },
      { $project: { _id: 1, userId: 1, amount: 1, description: 1, date: 1, isImported: 1, source: { $ifNull: ["$source", "CSV IMPORT"] }, category: "$source", type: { $literal: "income" } } }
    ];
  } else if (reqType === "expense") {
    pipeline = [
      { $match: expMatch },
      { $project: { _id: 1, userId: 1, amount: 1, description: 1, date: 1, isImported: 1, source: 1, category: 1, type: { $literal: "expense" } } }
    ];
  } else {
    pipeline = [
      { $match: expMatch },
      { $project: { _id: 1, userId: 1, amount: 1, description: 1, date: 1, isImported: 1, source: 1, category: 1, type: { $literal: "expense" } } },
      {
        $unionWith: {
          coll: "incomes",
          pipeline: [
            { $match: incMatch },
            { $project: { _id: 1, userId: 1, amount: 1, description: 1, date: 1, isImported: 1, source: { $ifNull: ["$source", "CSV IMPORT"] }, category: "$source", type: { $literal: "income" } } }
          ]
        }
      }
    ];
  }

  let sortStage = { date: -1 };
  if (sort === "amount_asc") sortStage = { amount: 1 };
  if (sort === "amount_desc") sortStage = { amount: -1 };
  if (sort === "oldest") sortStage = { date: 1 };

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const skipNum = (pageNum - 1) * limitNum;

  const aggregateModel = reqType === "income" ? Income : Expense;
  const result = await aggregateModel.aggregate([
    ...pipeline,
    { $sort: sortStage },
    {
      $facet: {
        data: [{ $skip: skipNum }, { $limit: limitNum }],
        totalCount: [{ $count: "count" }]
      }
    }
  ]);

  const paginatedTransactions = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return {
    data: paginatedTransactions,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
};

const StatementTransaction = require("../models/StatementTransaction");
const UserMerchantPreference = require("../models/UserMerchantPreference");
const { classifyTransaction, normalizeMerchantName } = require("./transactionClassifier");

const deleteTransaction = async (userId, type, id) => {
  if (type === "income") {
    await Income.findOneAndDelete({ _id: id, userId });
  } else {
    await Expense.findOneAndDelete({ _id: id, userId });
  }
  return true;
};

/**
 * Safe Reclassification Process for Existing Transactions
 * Re-evaluates transactions without altering amounts, dates, descriptions, signatures, or user IDs.
 */
const reclassifyTransactionsForUser = async (userId, options = {}) => {
  const { onlyOthers = false } = options;
  const objectId = new mongoose.Types.ObjectId(userId);

  // Fetch all Expenses for user
  const expQuery = { userId: objectId };
  if (onlyOthers) {
    expQuery.category = { $in: ["Others", "Other"] };
  }
  const expenses = await Expense.find(expQuery);

  // Fetch all Incomes for user
  const incQuery = { userId: objectId };
  if (onlyOthers) {
    incQuery.source = { $in: ["Others", "Other"] };
  }
  const incomes = await Income.find(incQuery);

  const beforeDistribution = {};
  const afterDistribution = {};
  let reclassifiedCount = 0;
  let movedFromOther = 0;
  let classifiedAsPersonTransfer = 0;
  let classifiedAsFood = 0;
  let classifiedAsShopping = 0;
  let classifiedAsGroceries = 0;
  let lowConfidenceCount = 0;
  let aiFallbackCount = 0;
  const reclassifiedDetails = [];

  // Track initial category distribution across expenses & incomes
  const allExpensesBefore = await Expense.find({ userId: objectId }).select("category").lean();
  const allIncomesBefore = await Income.find({ userId: objectId }).select("source").lean();

  allExpensesBefore.forEach((e) => {
    beforeDistribution[e.category] = (beforeDistribution[e.category] || 0) + 1;
  });
  allIncomesBefore.forEach((i) => {
    beforeDistribution[i.source] = (beforeDistribution[i.source] || 0) + 1;
  });

  // Reclassify Expenses
  for (const exp of expenses) {
    const classification = await classifyTransaction({
      merchant: exp.description,
      description: exp.description,
      type: "expense",
      source: exp.source,
      amount: exp.amount,
      userId,
    });

    if (classification.confidence === "low") {
      lowConfidenceCount += 1;
      aiFallbackCount += 1;
    }

    if (classification.category && classification.category !== exp.category) {
      const oldCat = exp.category;
      if (oldCat === "Other" || oldCat === "Others") {
        movedFromOther += 1;
      }

      exp.category = classification.category;
      await exp.save();

      // Update associated StatementTransaction if signature exists
      if (exp.signature) {
        await StatementTransaction.updateOne(
          { userId: objectId, signature: exp.signature },
          { $set: { category: classification.category } }
        );
      }

      reclassifiedCount += 1;
      reclassifiedDetails.push({
        id: exp._id,
        description: exp.description,
        oldCategory: oldCat,
        newCategory: classification.category,
        confidence: classification.confidence,
        score: classification.confidenceScore,
        reason: classification.reason,
      });
    }
  }

  // Reclassify Incomes
  for (const inc of incomes) {
    const classification = await classifyTransaction({
      merchant: inc.description,
      description: inc.description,
      type: "income",
      source: "income",
      amount: inc.amount,
      userId,
    });

    if (classification.confidence === "low") {
      lowConfidenceCount += 1;
      aiFallbackCount += 1;
    }

    if (classification.category && classification.category !== inc.source) {
      const oldSource = inc.source;
      if (oldSource === "Other" || oldSource === "Others") {
        movedFromOther += 1;
      }

      inc.source = classification.category;
      await inc.save();

      if (inc.signature) {
        await StatementTransaction.updateOne(
          { userId: objectId, signature: inc.signature },
          { $set: { category: classification.category } }
        );
      }

      reclassifiedCount += 1;
      reclassifiedDetails.push({
        id: inc._id,
        description: inc.description,
        oldCategory: oldSource,
        newCategory: classification.category,
        confidence: classification.confidence,
        score: classification.confidenceScore,
        reason: classification.reason,
      });
    }
  }

  // Track final category distribution
  const allExpensesAfter = await Expense.find({ userId: objectId }).select("category").lean();
  const allIncomesAfter = await Income.find({ userId: objectId }).select("source").lean();

  allExpensesAfter.forEach((e) => {
    afterDistribution[e.category] = (afterDistribution[e.category] || 0) + 1;
    if (e.category === "Person / Transfer") classifiedAsPersonTransfer += 1;
    if (e.category === "Food") classifiedAsFood += 1;
    if (e.category === "Shopping") classifiedAsShopping += 1;
    if (e.category === "Groceries") classifiedAsGroceries += 1;
  });

  allIncomesAfter.forEach((i) => {
    afterDistribution[i.source] = (afterDistribution[i.source] || 0) + 1;
    if (i.source === "Person / Transfer") classifiedAsPersonTransfer += 1;
  });

  return {
    totalTransactions: allExpensesAfter.length + allIncomesAfter.length,
    totalEvaluated: expenses.length + incomes.length,
    reclassifiedCount,
    movedFromOther,
    classifiedAsPersonTransfer,
    classifiedAsFood,
    classifiedAsShopping,
    classifiedAsGroceries,
    lowConfidenceCount,
    aiFallbackCount,
    beforeDistribution,
    afterDistribution,
    reclassifiedDetails,
  };
};

/**
 * Save User Merchant Category Preference
 */
const saveUserMerchantPreference = async (userId, merchantName, category) => {
  const normalized = normalizeMerchantName(merchantName);
  if (!normalized.normalizedKey) {
    throw new Error("Invalid merchant name provided");
  }

  const pref = await UserMerchantPreference.findOneAndUpdate(
    { userId, merchantKey: normalized.normalizedKey },
    { category: category.trim() },
    { upsert: true, new: true, runValidators: true }
  );

  // Automatically reclassify past transactions matching this merchant for this user
  const reclassifyResult = await reclassifyTransactionsForUser(userId, { onlyOthers: false });

  return {
    preference: pref,
    reclassifiedCount: reclassifyResult.reclassifiedCount,
  };
};

/**
 * Developer / Admin Classification Review Data
 */
const getClassificationReviewData = async (userId, options = {}) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const expenses = await Expense.find({ userId: objectId }).lean();
  const reviews = [];

  for (const exp of expenses) {
    const classification = await classifyTransaction({
      merchant: exp.description,
      description: exp.description,
      type: "expense",
      source: exp.source,
      amount: exp.amount,
      userId,
    });

    reviews.push({
      id: exp._id,
      description: exp.description,
      amount: exp.amount,
      currentCategory: exp.category,
      predictedCategory: classification.category,
      confidence: classification.confidence,
      confidenceScore: classification.confidenceScore,
      reason: classification.reason,
      isPerson: classification.isPerson,
      normalizedMerchant: classification.normalizedMerchant,
    });
  }

  // Sort by low confidence score first
  reviews.sort((a, b) => a.confidenceScore - b.confidenceScore);

  return {
    totalRecords: reviews.length,
    lowConfidenceCount: reviews.filter((r) => r.confidence === "low").length,
    reviews,
  };
};

module.exports = {
  getTransactionsByUser,
  deleteTransaction,
  reclassifyTransactionsForUser,
  saveUserMerchantPreference,
  getClassificationReviewData,
};
