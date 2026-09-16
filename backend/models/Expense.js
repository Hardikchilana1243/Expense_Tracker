const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be greater than 0"],
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "credit_card", "debit_card", "bank_transfer", "upi"],
      default: "cash",
    },
    source: {
      type: String,
      default: "manual",
    },
    isImported: {
      type: Boolean,
      default: false,
    },
    transactionId: {
      type: String,
      default: null,
    },
    signature: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Performance Indexes
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1, date: -1 });
expenseSchema.index({ userId: 1, signature: 1 });
expenseSchema.index({ userId: 1, transactionId: 1 }, { sparse: true });

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;
