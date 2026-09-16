const mongoose = require("mongoose");

const userMerchantPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    merchantKey: {
      type: String,
      required: [true, "Merchant key is required"],
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userMerchantPreferenceSchema.index({ userId: 1, merchantKey: 1 }, { unique: true });

const UserMerchantPreference = mongoose.model("UserMerchantPreference", userMerchantPreferenceSchema);

module.exports = UserMerchantPreference;
