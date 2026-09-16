const User = require("../models/User");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const MockBankAccount = require("../models/MockBankAccount");
const mongoose = require("mongoose");
const { createNotification, checkBudgetWarning } = require("./notificationController");

// ================= DYNAMIC TRANSACTION GENERATOR =================
const generateRandomTransactions = (count = 30) => {
  const expenseCategories = [
    { category: "🍜 Food", descriptions: ["Zomato order", "Swiggy lunch", "McDonalds", "Restaurant dinner", "Cafe Coffee Day"], min: 120, max: 1500 },
    { category: "🚗 Transportation", descriptions: ["Uber ride", "Ola Cab fare", "Petrol pump refill", "Metro recharge"], min: 80, max: 1200 },
    { category: "🛒 Shopping", descriptions: ["Amazon purchase", "Myntra shopping", "Zara clothing", "Supermarket shopping"], min: 300, max: 6000 },
    { category: "💸 Bills", descriptions: ["Electricity bill", "Gas refill", "Broadband internet bill"], min: 300, max: 4000 },
    { category: "🏥 Medical", descriptions: ["Apollo Pharmacy", "Doctor consultation", "Pathology lab test"], min: 150, max: 4500 },
    { category: "🎮 Entertainment", descriptions: ["Netflix subscription", "Spotify premium", "BookMyShow movie ticket"], min: 199, max: 1500 },
    { category: "🏠 Rent", descriptions: ["Monthly house rent", "Hostel accommodation fee"], min: 8000, max: 16000 },
    { category: "🎓 Education", descriptions: ["Tuition class fee", "Coursera premium", "College book store"], min: 500, max: 10000 },
    { category: "💡 Utilities", descriptions: ["Water utility bill", "Society maintenance charges"], min: 250, max: 2500 },
    { category: "✈️ Travel", descriptions: ["MakeMyTrip flight booking", "Weekend hotel stay", "IRCTC train ticket"], min: 1200, max: 9000 },
    { category: "🛒 Groceries", descriptions: ["BigBasket order", "Blinkit grocery delivery", "Local dairy shop"], min: 100, max: 2500 },
    { category: "📱 Recharge", descriptions: ["Jio mobile recharge", "Airtel prepaid recharge", "DTH subscription"], min: 99, max: 799 }
  ];

  const incomeCategories = [
    { category: "💼 Salary", descriptions: ["Salary credited", "Monthly payroll credit"], min: 30000, max: 85000 },
    { category: "💻 Freelance", descriptions: ["Freelance project payout", "Upwork milestone payment"], min: 4000, max: 25000 },
    { category: "👥 Bonus", descriptions: ["Quarterly performance bonus", "Diwali festival bonus"], min: 3000, max: 20000 },
    { category: "💐 Refund", descriptions: ["E-commerce refund received", "Canceled ticket refund"], min: 150, max: 3500 },
    { category: "📈 Investment", descriptions: ["Mutual fund dividend payout", "Stock dividend credit"], min: 500, max: 12000 },
    { category: "💰 Cashback", descriptions: ["Cred cashback reward", "GPay scratch card cashback"], min: 10, max: 550 },
    { category: "🎁 Gift", descriptions: ["Birthday cash gift", "Family pocket money"], min: 500, max: 5000 }
  ];

  const txList = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // 60-80% expenses, 20-40% income
    const isExpense = Math.random() < 0.75; // 75% expense, 25% income
    
    // Random date from last 15 to 60 days
    const daysAgo = Math.floor(Math.random() * 45) + 15;
    const txDate = new Date();
    txDate.setDate(now.getDate() - daysAgo);
    txDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

    if (isExpense) {
      const catObj = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const amount = Math.floor(Math.random() * (catObj.max - catObj.min + 1)) + catObj.min;
      const note = catObj.descriptions[Math.floor(Math.random() * catObj.descriptions.length)];
      
      txList.push({
        type: "expense",
        amount,
        category: catObj.category,
        date: txDate,
        note
      });
    } else {
      const catObj = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
      const amount = Math.floor(Math.random() * (catObj.max - catObj.min + 1)) + catObj.min;
      const note = catObj.descriptions[Math.floor(Math.random() * catObj.descriptions.length)];
      
      txList.push({
        type: "income",
        amount,
        category: catObj.category,
        date: txDate,
        note
      });
    }
  }

  // Sort by date descending
  return txList.sort((a, b) => b.date - a.date);
};

// ================= LINK BANK ACCOUNT =================
exports.linkBankAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountNumber, bankName } = req.body;

    if (userId !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (!accountNumber || !bankName) {
      return res.status(400).json({ success: false, message: "Account number and bank name required" });
    }

    // Validate mock account exists
    const mockAccount = await MockBankAccount.findOne({ accountNumber });
    if (!mockAccount) {
      return res.status(400).json({ success: false, message: "Invalid mock account number" });
    }

    const user = await User.findById(userId);
    user.bankAccount = { accountNumber, bankName, lastImportDate: null };
    await user.save();

    // Trigger Profile Notification
    await createNotification(
      userId,
      "profile",
      "🏦 Bank Linked Successfully",
      `Your ${bankName} account (****${accountNumber.slice(-4)}) has been successfully linked to your profile.`
    );

    res.json({
      success: true,
      message: "Bank account linked successfully",
      bankAccount: user.bankAccount
    });
  } catch (error) {
    console.error("Link account error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= IMPORT TRANSACTIONS =================
exports.importTransactions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user || !user.bankAccount || !user.bankAccount.accountNumber) {
      return res.status(400).json({ success: false, message: "No bank account linked" });
    }

    const mockAccount = await MockBankAccount.findOne({ 
      accountNumber: user.bankAccount.accountNumber 
    });

    if (!mockAccount) {
      return res.status(400).json({ success: false, message: "Mock bank account not found" });
    }

    // Generate dynamic mock transactions representing live activity since last sync
    const randomCount = Math.floor(Math.random() * 10) + 18; // 18 to 27 random mixed transactions
    const simulated = generateRandomTransactions(randomCount);

    // Keep unique signatures internally in the mock bank account
    const currentMockSignatures = new Set(mockAccount.transactions.map(tx => {
      const txDate = tx.date ? new Date(tx.date) : new Date();
      return `${txDate.toDateString()}-${tx.amount}-${tx.category}`;
    }));

    simulated.forEach(tx => {
      const sig = `${new Date(tx.date).toDateString()}-${tx.amount}-${tx.category}`;
      if (!currentMockSignatures.has(sig)) {
        mockAccount.transactions.push(tx);
        currentMockSignatures.add(sig);
      }
    });

    // Save newly generated transactions into the bank account
    mockAccount.totalTransactions = mockAccount.transactions.length;
    await mockAccount.save();

    // Deduplicate against the user's existing database records (look back 90 days to cover all gen ranges)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentExpenses = await Expense.find({
      userId,
      date: { $gte: ninetyDaysAgo }
    }).lean();
    
    const recentIncomes = await Income.find({
      userId,
      date: { $gte: ninetyDaysAgo }
    }).lean();

    const existingSignatures = new Set();
    [...recentExpenses, ...recentIncomes].forEach(tx => {
      const txDate = tx.date ? new Date(tx.date) : new Date();
      const sig = `${txDate.toDateString()}-${tx.amount}-${tx.category || tx.source}`;
      existingSignatures.add(sig);
    });

    // Safely map new bank transactions to import payload
    const newTransactions = mockAccount.transactions
      .filter(tx => {
        const txDate = tx.date ? new Date(tx.date) : new Date();
        const sig = `${txDate.toDateString()}-${tx.amount}-${tx.category}`;
        return !existingSignatures.has(sig);
      })
      .slice(0, 50) // Limit to latest 50
      .map(tx => {
        const plainTx = tx.toObject ? tx.toObject() : tx;
        delete plainTx._id;
        return {
          userId: new mongoose.Types.ObjectId(userId),
          ...plainTx,
          date: plainTx.date ? new Date(plainTx.date) : new Date(),
          description: plainTx.note || '',
          isImported: true,
          paymentMethod: plainTx.type === 'income' ? 'bank_transfer' : 'upi'
        };
      });

    if (newTransactions.length === 0) {
      return res.json({ 
        success: true, 
        message: "Bank account is already up to date.",
        imported: 0 
      });
    }

    // Map income documents for insertion
    const incomeTx = newTransactions.filter(t => t.type === 'income').map(t => ({
      userId: t.userId,
      amount: t.amount,
      source: t.category,
      date: t.date,
      description: t.description || t.note || "Bank Deposit",
      isImported: true
    }));

    // Map expense documents for insertion (ensuring lowercase enum compliance)
    const expenseTx = newTransactions.filter(t => t.type === 'expense').map(t => ({
      userId: t.userId,
      amount: t.amount,
      category: t.category,
      date: t.date,
      description: t.description || t.note || "Bank Transaction",
      paymentMethod: "upi", // lowercase schema enum compliant
      isImported: true
    }));

    // Insert into collections
    const incomeResults = incomeTx.length ? await Income.insertMany(incomeTx) : [];
    const expenseResults = expenseTx.length ? await Expense.insertMany(expenseTx) : [];

    console.log(`✅ Bulk Imported: ${incomeResults.length} Incomes, ${expenseResults.length} Expenses`);

    // Record last import timestamp
    user.bankAccount.lastImportDate = new Date();
    await user.save();

    // Trigger notification alert
    await createNotification(
      userId,
      "transaction_import",
      "📥 Bank Sync Complete",
      `${newTransactions.length} new bank transactions imported successfully from ${user.bankAccount.bankName}.`
    );

    // Trigger budget checking for each newly imported expense
    for (const exp of expenseTx) {
      await checkBudgetWarning(userId, exp.category, exp.amount);
    }

    res.json({
      success: true,
      message: `Bank sync completed — ${incomeResults.length} income and ${expenseResults.length} expense transactions imported.`,
      imported: newTransactions.length,
      incomes: incomeResults.length,
      expenses: expenseResults.length,
      bankAccount: user.bankAccount
    });

  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET LINKED ACCOUNTS =================
exports.getBankAccounts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    const hasAccount = user && user.bankAccount && user.bankAccount.accountNumber;
    res.json({
      success: true,
      bankAccount: hasAccount ? user.bankAccount : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
