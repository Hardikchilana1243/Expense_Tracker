const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");

const { classifyTransactionSync } = require("./transactionClassifier");

const normalizeCategory = (description = "", amount = 0, type = "expense") => {
  const result = classifyTransactionSync({ merchant: description, description, type, amount });
  return result.category || (type === "income" ? "Salary" : "Other");
};

/**
 * Robust Date Parser supporting DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ISO, etc.
 */
const normalizeDate = (value) => {
  if (!value && value !== 0) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Try matching DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    const parsed = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // Try matching YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const parsed = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // Fallback to JS native parser
  const nativeParsed = new Date(str);
  return Number.isNaN(nativeParsed.getTime()) ? null : nativeParsed;
};

const parseAmount = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const cleanStr = String(value).replace(/[^\d.-]/g, "");
  const parsedValue = parseFloat(cleanStr);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

/**
 * Extract clean person/merchant display name from transaction details text (preserving spaces & original casing)
 */
const extractDisplayName = (rawDetails = "", type = "expense") => {
  if (!rawDetails || typeof rawDetails !== "string") return "Unknown";
  let text = String(rawDetails).trim();
  if (!text) return "Unknown";

  // 1. Remove prefixes
  text = text.replace(/^(paid to|payment to|sent to|paid|received from|credit from|received|upi payment to|money transfer to|transfer to|bill paid to|recharge for|order at)\s+/i, "");

  // 2. Remove UPI IDs (e.g. rahul@okaxis)
  text = text.replace(/\b[a-zA-Z0-9.\-_]+@(okaxis|ybl|paytm|icici|upi|sbi|axis|ibl|postbank|okhdfcbank)\b/gi, "").trim();

  // 3. Remove trailing transaction IDs, UTRs, or long numeric patterns
  text = text.replace(/\b(UPI|UTR|TXN|REF)[\/:\s]*[0-9a-zA-Z]+\b/gi, "").trim();
  text = text.replace(/\b[0-9]{10,}\b/g, "").trim();

  // 4. Clean extra spaces or trailing punctuation
  text = text.replace(/^[\s\-_:]+|[\s\-_:]+$/g, "").trim();

  if (!text) return "Unknown";

  // Clean extra inner whitespace while preserving original casing and spaces
  const cleanSpaces = text.replace(/\s+/g, " ").trim();
  return cleanSpaces || "Unknown";
};

/**
 * Detect statement provider (GOOGLE_PAY vs PHONEPE vs GENERIC)
 */
const detectStatementProvider = (headers = []) => {
  const normHeaders = headers.map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Explicit unique identifier check first
  if (normHeaders.includes("utr") || normHeaders.includes("phonepe") || normHeaders.includes("instrument")) {
    return "PHONEPE";
  }
  if (normHeaders.includes("upitransactionid") || normHeaders.includes("amountinr")) {
    return "GOOGLE_PAY";
  }

  // Header combination check
  const isPhonePe =
    normHeaders.includes("paidto") ||
    normHeaders.includes("receivedfrom") ||
    normHeaders.includes("merchant");

  if (isPhonePe) return "PHONEPE";

  const isGPay =
    normHeaders.includes("transactiondetails") ||
    (normHeaders.includes("type") && normHeaders.includes("amount"));

  if (isGPay) return "GOOGLE_PAY";

  return null;
};

const parseGooglePayRow = (rawRow) => {
  const getVal = (aliases) => {
    for (const key of Object.keys(rawRow)) {
      const cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (aliases.includes(cleanKey) && rawRow[key] !== undefined && rawRow[key] !== "") {
        return rawRow[key];
      }
    }
    return undefined;
  };

  const dateVal = getVal(["date", "datetime", "transactiondate", "dateandtime"]);
  const typeVal = getVal(["type", "transactiontype"]);
  const detailsVal = getVal(["transactiondetails", "details", "description", "particulars", "paidto", "receivedfrom"]);
  const amountVal = getVal(["amountinr", "amount", "transactionamount"]);
  const txIdVal = getVal(["upitransactionid", "transactionid", "utr", "referenceid", "refno"]);

  const rawAmount = parseAmount(amountVal);
  if (rawAmount <= 0) return null;

  const typeStr = String(typeVal || "").trim().toLowerCase();
  let type = "expense";
  if (typeStr.includes("received") || typeStr.includes("credit") || typeStr.includes("income")) {
    type = "income";
  }

  const rawDetails = String(detailsVal || "").trim() || "Google Pay Transaction";
  const displayName = extractDisplayName(rawDetails, type);
  const dateObj = normalizeDate(dateVal) || new Date();
  const category = normalizeCategory(displayName !== "Unknown" ? displayName : rawDetails, Math.abs(rawAmount), type);

  return {
    date: dateObj.toISOString(),
    displayName,
    description: displayName !== "Unknown" ? displayName : rawDetails,
    rawDetails,
    amount: Math.abs(rawAmount),
    type,
    category,
    transactionId: txIdVal ? String(txIdVal).trim() : null,
    source: "GOOGLE_PAY",
  };
};

const parsePhonePeRow = (rawRow) => {
  const getVal = (aliases) => {
    for (const key of Object.keys(rawRow)) {
      const cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (aliases.includes(cleanKey) && rawRow[key] !== undefined && rawRow[key] !== "") {
        return rawRow[key];
      }
    }
    return undefined;
  };

  const dateVal = getVal(["date", "datetime", "transactiondate", "dateandtime"]);
  const typeVal = getVal(["type", "transactiontype", "debitcredit", "drcr"]);
  const detailsVal = getVal(["transactiondetails", "details", "description", "paidto", "receivedfrom", "merchant"]);
  const amountVal = getVal(["amount", "amountinr", "txnamount"]);
  const txIdVal = getVal(["utr", "transactionid", "refno", "referenceno"]);

  const rawAmount = parseAmount(amountVal);
  if (rawAmount <= 0) return null;

  const typeStr = String(typeVal || "").trim().toLowerCase();
  let type = "expense";
  if (typeStr.includes("received") || typeStr.includes("credit") || typeStr.includes("cr") || typeStr.includes("income")) {
    type = "income";
  }

  const rawDetails = String(detailsVal || "").trim() || "PhonePe Transaction";
  const displayName = extractDisplayName(rawDetails, type);
  const dateObj = normalizeDate(dateVal) || new Date();
  const category = normalizeCategory(displayName !== "Unknown" ? displayName : rawDetails, Math.abs(rawAmount), type);

  return {
    date: dateObj.toISOString(),
    displayName,
    description: displayName !== "Unknown" ? displayName : rawDetails,
    rawDetails,
    amount: Math.abs(rawAmount),
    type,
    category,
    transactionId: txIdVal ? String(txIdVal).trim() : null,
    source: "PHONEPE",
  };
};

const parseCsvFile = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase();

  if (extension !== ".csv" && extension !== ".xlsx" && extension !== ".xls") {
    throw new Error("Unsupported file type. Please upload a .csv file.");
  }

  let rawRows = [];
  if (extension === ".csv") {
    rawRows = await new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows))
        .on("error", reject);
    });
  } else {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error("CSV file is empty or contains no transaction rows.");
  }

  const headers = Object.keys(rawRows[0] || {});
  const provider = detectStatementProvider(headers);

  let parsedRows = [];
  if (provider === "GOOGLE_PAY") {
    parsedRows = rawRows.map(parseGooglePayRow).filter(Boolean);
  } else if (provider === "PHONEPE") {
    parsedRows = rawRows.map(parsePhonePeRow).filter(Boolean);
  } else {
    const err = new Error("Unsupported statement format. Currently supported: Google Pay and PhonePe.");
    err.code = "UNSUPPORTED_STATEMENT_FORMAT";
    throw err;
  }

  return {
    provider: provider || "GOOGLE_PAY",
    rows: parsedRows,
    totalRows: rawRows.length,
  };
};

module.exports = {
  parseCsvFile,
  normalizeCategory,
  normalizeDate,
  extractDisplayName,
  detectStatementProvider,
};
