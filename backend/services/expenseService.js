const Expense = require("../models/Expense");
const StatementTransaction = require("../models/StatementTransaction");
const mongoose = require("mongoose");

const buildDateFilter = (dateRange, dateFrom, dateTo) => {
  const now = new Date();
  if (dateRange === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { $gte: start, $lte: end };
  }
  if (dateRange === "this_week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return { $gte: startOfWeek };
  }
  if (dateRange === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { $gte: startOfMonth };
  }
  if (dateRange === "last_month") {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { $gte: startOfLastMonth, $lte: endOfLastMonth };
  }
  if (dateRange === "custom") {
    const filter = {};
    if (dateFrom) filter.$gte = new Date(dateFrom);
    if (dateTo) {
      const endTo = new Date(dateTo);
      endTo.setHours(23, 59, 59, 999);
      filter.$lte = endTo;
    }
    if (Object.keys(filter).length > 0) return filter;
  }
  return null;
};

const buildExpenseQuery = (userId, options = {}) => {
  const { search, category, dateRange, dateFrom, dateTo } = options;
  const query = { userId: new mongoose.Types.ObjectId(userId) };

  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [{ category: searchRegex }, { description: searchRegex }];
  }

  if (category && category !== "all" && category.trim() !== "") {
    query.category = category;
  }

  const dateFilter = buildDateFilter(dateRange, dateFrom, dateTo);
  if (dateFilter) {
    query.date = dateFilter;
  }

  return query;
};

const getExpensesByUser = async (userId, options = {}) => {
  const query = buildExpenseQuery(userId, options);
  const { page, limit, sort } = options;

  let sortOption = { date: -1, _id: -1 };
  if (sort === "oldest") sortOption = { date: 1, _id: 1 };
  if (sort === "amount_high") sortOption = { amount: -1, date: -1 };
  if (sort === "amount_low") sortOption = { amount: 1, date: -1 };

  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [items, totalItems, totalExpenseAgg] = await Promise.all([
      Expense.find(query).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    const totalExpense = totalExpenseAgg[0]?.total || 0;

    return {
      data: items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
      totalExpense,
    };
  }

  return Expense.find(query).sort(sortOption).lean();
};

const createExpense = async (userId, { category, amount, description, paymentMethod }) => {
  const newExpense = new Expense({
    userId: new mongoose.Types.ObjectId(userId),
    category,
    amount: parseFloat(amount),
    description: description || "",
    paymentMethod: paymentMethod || "cash",
  });
  await newExpense.save();
  return newExpense;
};

const updateExpense = async (expenseId, userId, { category, amount, description, paymentMethod }) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) return null;
  if (expense.userId.toString() !== userId.toString()) {
    const error = new Error("Unauthorized access");
    error.code = "FORBIDDEN";
    throw error;
  }

  return Expense.findByIdAndUpdate(
    expenseId,
    { category, amount: parseFloat(amount), description, paymentMethod },
    { new: true, runValidators: true }
  );
};

const deleteExpense = async (expenseId, userId) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) return false;
  if (expense.userId.toString() !== userId.toString()) {
    const error = new Error("Unauthorized access");
    error.code = "FORBIDDEN";
    throw error;
  }

  if (expense.signature) {
    await StatementTransaction.deleteOne({ userId, signature: expense.signature });
  }

  await Expense.findByIdAndDelete(expenseId);
  return true;
};

const deleteBulkExpenses = async (userId, ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) return { deletedCount: 0 };
  const validIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (validIds.length === 0) return { deletedCount: 0 };

  const items = await Expense.find({
    userId: new mongoose.Types.ObjectId(userId),
    _id: { $in: validIds },
  }).select("signature").lean();

  const signatures = items.map((i) => i.signature).filter(Boolean);
  if (signatures.length > 0) {
    await StatementTransaction.deleteMany({ userId, signature: { $in: signatures } });
  }

  const result = await Expense.deleteMany({
    userId: new mongoose.Types.ObjectId(userId),
    _id: { $in: validIds },
  });

  return { deletedCount: result.deletedCount || 0 };
};

const deleteFilteredExpenses = async (userId, options = {}) => {
  const query = buildExpenseQuery(userId, options);
  const items = await Expense.find(query).select("signature").lean();
  const signatures = items.map((i) => i.signature).filter(Boolean);
  if (signatures.length > 0) {
    await StatementTransaction.deleteMany({ userId, signature: { $in: signatures } });
  }

  const result = await Expense.deleteMany(query);
  return { deletedCount: result.deletedCount || 0 };
};

module.exports = {
  getExpensesByUser,
  createExpense,
  updateExpense,
  deleteExpense,
  deleteBulkExpenses,
  deleteFilteredExpenses,
};
