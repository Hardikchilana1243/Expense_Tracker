const mongoose = require("mongoose");

/**
 * Budget Schema
 * Stores one budget per (userId, category, month, year) combination.
 * "spent" is always calculated dynamically via aggregation — not stored here.
 */
const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    // Monthly budget limit in INR
    limit: {
      type: Number,
      required: [true, "Budget limit is required"],
      min: [1, "Limit must be at least 1"],
    },
    // Which month (1-12) and year this budget applies to
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      default: () => new Date().getMonth() + 1,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
  },
  { timestamps: true }
);

// Ensure one budget per user/category/month/year
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });
budgetSchema.index({ userId: 1, month: 1, year: 1 });

const Budget = mongoose.model("Budget", budgetSchema);
module.exports = Budget;
