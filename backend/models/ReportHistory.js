const mongoose = require("mongoose");

const reportHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    channel: {
      type: String,
      enum: ["email", "whatsapp"],
      required: true,
    },
    recipient: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "partial"],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    failureReason: {
      type: String,
      default: null,
    },
    providerMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportHistorySchema.index({ userId: 1, month: 1, year: 1, channel: 1 }, { unique: true });

module.exports = mongoose.model("ReportHistory", reportHistorySchema);
