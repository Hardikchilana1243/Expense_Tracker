const mongoose = require("mongoose");

// Schema for individual transactions within a mock account
const mockTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["income", "expense"], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String },
});

const mockBankAccountSchema = new mongoose.Schema({
  accountNumber: { type: String, required: true, unique: true },
  bankName: { type: String, required: true },
  transactions: [mockTransactionSchema],
  totalTransactions: { type: Number, default: 0 }
}, { timestamps: true });

const MockBankAccount = mongoose.model("MockBankAccount", mockBankAccountSchema);

// Personas Data
const sbiTx = [
  { type: "expense", amount: 150, category: "🍜 Food", note: "Mess bill" },
  { type: "income", amount: 2000, category: "Pocket Money", note: "From Dad" },
  { type: "expense", amount: 500, category: "📱 Mobile", note: "Recharge" },
  { type: "expense", amount: 200, category: "🍜 Food", note: "Maggi party" },
  { type: "expense", amount: 1200, category: "📚 Books", note: "Semester notes" }
];

const hdfcTx = [
  { type: "income", amount: 45000, category: "Salary", note: "Monthly Pay" },
  { type: "expense", amount: 12000, category: "🏠 Rent", note: "May Rent" },
  { type: "expense", amount: 2500, category: "🛒 Shopping", note: "Groceries" },
  { type: "expense", amount: 1500, category: "💡 Utilities", note: "Electricity bill" },
  { type: "expense", amount: 800, category: "🚗 Transportation", note: "Petrol" },
  { type: "expense", amount: 3000, category: "🎮 Entertainment", note: "Dinner out" }
];

const iciciTx = [
  { type: "income", amount: 15000, category: "Project Payout", note: "Web Design Client" },
  { type: "income", amount: 8000, category: "Consulting", note: "UI Review" },
  { type: "expense", amount: 1200, category: "🍜 Food", note: "Coffee & Snacks" },
  { type: "expense", amount: 4000, category: "🛍️ Shopping", note: "New Headphones" },
  { type: "expense", amount: 500, category: "🚗 Transportation", note: "Uber ride" }
];

const axisTx = [
  { type: "income", amount: 120000, category: "Sales Revenue", note: "Client A Order" },
  { type: "income", amount: 95000, category: "Sales Revenue", note: "Client B Order" },
  { type: "expense", amount: 40000, category: "Inventory", note: "Raw Materials" },
  { type: "expense", amount: 15000, category: "🏠 Rent", note: "Office Rent" },
  { type: "expense", amount: 5000, category: "💡 Utilities", note: "Internet & Water" }
];

const kotakTx = [
  { type: "income", amount: 65000, category: "Salary", note: "Monthly Pay" },
  { type: "expense", amount: 4000, category: "🏥 Medical", note: "Health Checkup" },
  { type: "expense", amount: 5000, category: "👗 Clothes", note: "Shopping Mall" },
  { type: "expense", amount: 2000, category: "✈️ Travel", note: "Weekend Trip" },
  { type: "expense", amount: 1000, category: "🎮 Entertainment", note: "Movie night" }
];

// Seed function
MockBankAccount.seedMockData = async function () {
  try {
    const personas = [
      { accountNumber: "SBI9876543210", bankName: "State Bank of India", transactions: sbiTx },
      { accountNumber: "HDFC1234567890", bankName: "HDFC Bank", transactions: hdfcTx },
      { accountNumber: "ICICI1122334455", bankName: "ICICI Bank", transactions: iciciTx },
      { accountNumber: "AXIS5566778899", bankName: "Axis Bank", transactions: axisTx },
      { accountNumber: "KOTAK6677889900", bankName: "Kotak Mahindra Bank", transactions: kotakTx }
    ];

    for (const p of personas) {
      await this.findOneAndUpdate(
        { accountNumber: p.accountNumber },
        { ...p, totalTransactions: p.transactions.length },
        { upsert: true, new: true }
      );
    }
    console.log("✅ Mock Bank Personas Synchronized");
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  }
};

module.exports = MockBankAccount;
