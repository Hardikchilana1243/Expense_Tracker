const { classifyTransaction } = require('./transactionClassifier');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const StatementTransaction = require('../models/StatementTransaction');
const Notification = require('../models/Notification');

const buildDuplicateSignature = ({ userId, transactionDate, description, amount, reference }) => {
  const dateStr = new Date(transactionDate).toISOString().split("T")[0];
  const descStr = String(description).trim().toLowerCase();
  const amtStr = Number(amount).toFixed(2);
  const refStr = reference ? String(reference).trim().toLowerCase() : "";
  return `${String(userId)}:${dateStr}:${descStr}:${amtStr}${refStr ? `:${refStr}` : ""}`;
};

const createNotification = async ({ userId, title, message, type = 'transaction_import' }) => {
  try {
    await Notification.create({
      userId,
      type,
      title,
      message,
      isRead: false,
    });
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
};

const summarizeTransactions = async (userId) => {
  const objectId = userId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [incomeDocs, expenseDocs] = await Promise.all([
    Income.find({ userId: objectId }).lean(),
    Expense.find({ userId: objectId }).lean(),
  ]);

  const totalIncome = incomeDocs.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalExpense = expenseDocs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthlyIncome = incomeDocs
    .filter((i) => new Date(i.date) >= startOfMonth)
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const monthlyExpense = expenseDocs
    .filter((e) => new Date(e.date) >= startOfMonth)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const highestExpenseCategory = expenseDocs.reduce((acc, expense) => {
    const current = acc[expense.category] || 0;
    acc[expense.category] = current + Number(expense.amount || 0);
    return acc;
  }, {});

  const highestSpendingCategory = Object.entries(highestExpenseCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Others';
  const highestIncomeSource = incomeDocs.reduce((acc, income) => {
    const current = acc[income.source] || 0;
    acc[income.source] = current + Number(income.amount || 0);
    return acc;
  }, {});

  const dominantIncomeSource = Object.entries(highestIncomeSource).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    savings: totalIncome - totalExpense,
    monthlyIncome,
    monthlyExpense,
    highestSpendingCategory,
    highestIncomeSource: dominantIncomeSource,
  };
};

const createSmartInsights = async (userId) => {
  const objectId = userId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [incomeDocs, expenseDocs] = await Promise.all([
    Income.find({ userId: objectId, date: { $gte: startOfMonth } }).lean(),
    Expense.find({ userId: objectId, date: { $gte: startOfMonth } }).lean(),
  ]);

  const totalIncome = incomeDocs.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalExpense = expenseDocs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const categoryTotals = expenseDocs.reduce((acc, expense) => {
    const current = acc[expense.category] || 0;
    acc[expense.category] = current + Number(expense.amount || 0);
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const largestTransaction = expenseDocs.concat(incomeDocs).sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
  const merchantCount = expenseDocs.reduce((acc, expense) => {
    acc[expense.description] = (acc[expense.description] || 0) + 1;
    return acc;
  }, {});
  const mostVisitedMerchant = Object.entries(merchantCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const topInsights = [];
  if (sortedCategories[0]) {
    topInsights.push(`You spent ${Math.round((sortedCategories[0][1] / Math.max(totalExpense, 1)) * 100)}% on ${sortedCategories[0][0]} this month.`);
  }
  if (savingsRate > 25) {
    topInsights.push('Your savings rate is excellent.');
  } else if (savingsRate > 10) {
    topInsights.push('Your savings rate is healthy.');
  } else {
    topInsights.push('Your savings rate needs improvement.');
  }
  if (largestTransaction) {
    topInsights.push(`Largest transaction this month ₹${Number(largestTransaction.amount).toLocaleString('en-IN')}.`);
  }
  if (mostVisitedMerchant !== 'N/A') {
    topInsights.push(`Most visited merchant ${mostVisitedMerchant}.`);
  }
  if (sortedCategories.length > 1) {
    const secondCategory = sortedCategories[1];
    topInsights.push(`${secondCategory[0]} is your next major spending category.`);
  }

  return topInsights.slice(0, 5);
};

const applySmartTransactionEngine = async ({ userId, rows }) => {
  const imported = [];
  let importedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  // Pre-fetch all existing signatures and transaction IDs for this user in 1 fast batch
  const [
    existingExpenseSignatures,
    existingExpenseTxIds,
    existingIncomeSignatures,
    existingIncomeTxIds,
    existingStatementSignatures
  ] = await Promise.all([
    Expense.distinct("signature", { userId, signature: { $ne: null } }),
    Expense.distinct("transactionId", { userId, transactionId: { $ne: null } }),
    Income.distinct("signature", { userId, signature: { $ne: null } }),
    Income.distinct("transactionId", { userId, transactionId: { $ne: null } }),
    StatementTransaction.distinct("signature", { userId }),
  ]);

  const expenseSigSet = new Set(existingExpenseSignatures);
  const expenseTxIdSet = new Set(existingExpenseTxIds);
  const incomeSigSet = new Set(existingIncomeSignatures);
  const incomeTxIdSet = new Set(existingIncomeTxIds);
  const statementSigSet = new Set(existingStatementSignatures);

  const expenseDocsToInsert = [];
  const incomeDocsToInsert = [];
  const statementDocsToInsert = [];

  for (const row of rows) {
    if (!row) {
      invalidCount += 1;
      continue;
    }

    const rowType = (row.type || 'expense').toLowerCase();
    const displayName = String(row.displayName || row.description || '').trim();
    const amount = Number(row.amount || 0);
    const transactionDate = row.date ? new Date(row.date) : new Date();
    const sourceName = row.source || 'GOOGLE_PAY';

    if (!displayName || amount <= 0 || Number.isNaN(transactionDate.getTime())) {
      invalidCount += 1;
      continue;
    }

    const classificationResult = await classifyTransaction({
      merchant: displayName,
      description: displayName,
      type: rowType,
      source: sourceName,
      amount,
      userId,
    });
    const categoryName = (row.category && row.category !== "Others" && row.category !== "Other")
      ? row.category
      : classificationResult.category || (rowType === "income" ? "Salary" : "Other");
    const txIdStr = row.transactionId ? String(row.transactionId).trim() : null;
    const signature = txIdStr
      ? `${String(userId)}:${sourceName}:${txIdStr.toLowerCase()}`
      : buildDuplicateSignature({
          userId,
          transactionDate: transactionDate.toISOString(),
          description: displayName,
          amount,
          reference: row.reference,
        });

    // In-memory O(1) duplicate checks
    let isDuplicate = false;
    if (rowType === "expense") {
      if (expenseSigSet.has(signature) || (txIdStr && expenseTxIdSet.has(txIdStr))) {
        isDuplicate = true;
      }
    } else {
      if (incomeSigSet.has(signature) || (txIdStr && incomeTxIdSet.has(txIdStr))) {
        isDuplicate = true;
      }
    }

    if (statementSigSet.has(signature) || isDuplicate) {
      duplicateCount += 1;
      skippedCount += 1;
      continue;
    }

    // Track signature in Sets to prevent intra-file duplicate rows
    statementSigSet.add(signature);
    if (rowType === "expense") {
      expenseSigSet.add(signature);
      if (txIdStr) expenseTxIdSet.add(txIdStr);
    } else {
      incomeSigSet.add(signature);
      if (txIdStr) incomeTxIdSet.add(txIdStr);
    }

    const payload = {
      userId,
      type: rowType,
      category: categoryName,
      amount,
      description: displayName,
      source: sourceName,
      imported: true,
      transactionDate,
      signature,
    };

    statementDocsToInsert.push(payload);

    if (rowType === 'expense') {
      expenseDocsToInsert.push({
        userId,
        category: categoryName,
        amount,
        description: displayName,
        date: transactionDate,
        source: sourceName,
        isImported: true,
        transactionId: txIdStr,
        signature,
      });
      expenseCount += 1;
    } else {
      incomeDocsToInsert.push({
        userId,
        source: categoryName,
        amount,
        description: displayName,
        date: transactionDate,
        isImported: true,
        transactionId: txIdStr,
        signature,
      });
      incomeCount += 1;
    }

    imported.push(payload);
    importedCount += 1;
  }

  // Bulk insertions in parallel
  await Promise.all([
    statementDocsToInsert.length > 0 ? StatementTransaction.insertMany(statementDocsToInsert) : Promise.resolve(),
    expenseDocsToInsert.length > 0 ? Expense.insertMany(expenseDocsToInsert) : Promise.resolve(),
    incomeDocsToInsert.length > 0 ? Income.insertMany(incomeDocsToInsert) : Promise.resolve(),
  ]);

  const summary = await summarizeTransactions(userId);
  const insights = await createSmartInsights(userId);

  if (importedCount > 0) {
    await createNotification({
      userId,
      type: 'transaction_import',
      title: 'CSV Statement Imported',
      message: `Successfully imported ${importedCount} transactions (${incomeCount} Income, ${expenseCount} Expenses).`,
    });
  }

  return {
    imported: importedCount,
    skipped: skippedCount,
    duplicateCount,
    invalidCount,
    incomeCount,
    expenseCount,
    totalRows: rows.length,
    summary,
    insights,
    importedTransactions: imported,
  };
};

module.exports = {
  applySmartTransactionEngine,
  summarizeTransactions,
  createSmartInsights,
};
