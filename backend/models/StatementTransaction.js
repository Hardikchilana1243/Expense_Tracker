const mongoose = require("mongoose");

const statementTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: "Bank Statement",
    },
    imported: {
      type: Boolean,
      default: true,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
    categoryUpdatedBy: {
      type: String,
      enum: ["user", "system"],
      default: "system",
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    
  },
  {
    timestamps: true,
  }
);

// User-scoped duplicate prevention
statementTransactionSchema.index({ userId: 1, signature: 1 }, { unique: true });

const StatementTransaction = mongoose.model("StatementTransaction", statementTransactionSchema);

module.exports = StatementTransaction;
