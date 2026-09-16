const fs = require("fs");
const { parseCsvFile } = require("../services/csvParser");
const { applySmartTransactionEngine } = require("../services/smartTransactionEngine");

exports.previewStatement = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { provider, rows, totalRows } = await parseCsvFile(req.file.path);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Unsupported statement format. Currently supported: Google Pay and PhonePe.",
      });
    }

    let incomeCount = 0;
    let expenseCount = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    const dates = [];

    rows.forEach((r) => {
      if (r.type === "income") {
        incomeCount += 1;
        totalIncome += Number(r.amount) || 0;
      } else {
        expenseCount += 1;
        totalExpense += Number(r.amount) || 0;
      }
      if (r.date) {
        dates.push(new Date(r.date));
      }
    });

    dates.sort((a, b) => a - b);
    const formatDateStr = (d) =>
      d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";

    const dateRange = {
      start: dates.length > 0 ? formatDateStr(dates[0]) : "N/A",
      end: dates.length > 0 ? formatDateStr(dates[dates.length - 1]) : "N/A",
    };

    const previewTransactions = rows.slice(0, 10).map((r) => ({
      displayName: r.displayName || r.description || "Unknown",
      type: r.type,
      amount: r.amount,
      date: r.date,
      category: r.category,
      transactionId: r.transactionId || null,
    }));

    return res.status(200).json({
      success: true,
      source: provider || "GOOGLE_PAY",
      totalRows: totalRows || rows.length,
      incomeCount,
      expenseCount,
      totalIncome,
      totalExpense,
      dateRange,
      previewTransactions,
    });
  } catch (error) {
    console.error("Statement preview error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Unsupported statement format. Currently supported: Google Pay and PhonePe.",
    });
  } finally {
    if (req.file?.path) {
      fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    }
  }
};

exports.uploadStatement = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { provider, rows, totalRows } = await parseCsvFile(req.file.path);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Unsupported statement format. Currently supported: Google Pay and PhonePe.",
      });
    }

    const result = await applySmartTransactionEngine({ userId: req.userId, rows });

    const summaryPayload = {
      totalRows: result.totalRows || totalRows,
      imported: result.imported,
      duplicates: result.duplicateCount,
      invalid: result.invalidCount,
      income: result.incomeCount,
      expenses: result.expenseCount,
    };

    return res.status(200).json({
      success: true,
      source: provider || "GOOGLE_PAY",
      summary: summaryPayload,
      imported: result.imported,
      skipped: result.skipped,
      duplicateCount: result.duplicateCount,
      insights: result.insights,
      message: result.imported > 0
        ? `Import completed: ${result.imported} imported from ${provider === "PHONEPE" ? "PhonePe" : "Google Pay"} (${result.incomeCount} Income, ${result.expenseCount} Expenses), ${result.duplicateCount} duplicates skipped.`
        : result.duplicateCount > 0
        ? `All ${result.duplicateCount} transactions in the statement were already imported.`
        : "No valid transactions found in statement file.",
    });
  } catch (error) {
    console.error("Statement upload error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to import statement",
    });
  } finally {
    if (req.file?.path) {
      fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    }
  }
};
