const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    source: {
      type: String,
      required: [true, "Income source is required"],
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
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, signature: 1 });
incomeSchema.index({ userId: 1, transactionId: 1 }, { sparse: true });

const Income = mongoose.model("Income", incomeSchema);

module.exports = Income;
