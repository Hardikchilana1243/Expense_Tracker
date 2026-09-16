import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { API_ENDPOINTS } from "../utils/apiPaths";

const ACCEPTED_EXTENSIONS = [".csv"];

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const StatementUploader = ({ userId, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const isValidFile = (selectedFile) => {
    if (!selectedFile) return false;
    const extension = `.${selectedFile.name.split(".").pop().toLowerCase()}`;
    return ACCEPTED_EXTENSIONS.includes(extension);
  };

  const resetState = () => {
    setProgress(0);
    setStatus("idle");
    setMessage("");
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
  };

  const fetchPreview = async (selectedFile) => {
    if (!selectedFile || !userId) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsPreviewing(true);
    setStatus("previewing");
    setMessage("Detecting statement format...");

    try {
      const res = await fetch(API_ENDPOINTS.STATEMENTS.PREVIEW, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPreviewData(data);
        setStatus("preview_ready");
        setMessage(`Statement detected: ${data.source === "PHONEPE" ? "PhonePe" : "Google Pay"}`);
      } else {
        const errMsg = data.message || "Unsupported statement format. Currently supported: Google Pay and PhonePe.";
        setStatus("error");
        setMessage(errMsg);
        toast.error(errMsg);
        setPreviewData(null);
      }
    } catch (err) {
      console.error("Preview fetch error:", err);
      const errMsg = "Unsupported statement format. Currently supported: Google Pay and PhonePe.";
      setStatus("error");
      setMessage(errMsg);
      toast.error(errMsg);
      setPreviewData(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;

    if (!isValidFile(selectedFile)) {
      setStatus("error");
      setMessage("Please upload a valid CSV file.");
      toast.error("Please upload a valid CSV file.");
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
    fetchPreview(selectedFile);
  };

  const confirmImport = async () => {
    if (!file || !userId) {
      setStatus("error");
      setMessage("Please select a statement CSV before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setProgress(30);
    setStatus("uploading");
    setMessage("Processing & inserting transactions into database...");

    try {
      const res = await fetch(API_ENDPOINTS.STATEMENTS.UPLOAD, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setProgress(100);
        setImportResult(data);
        const msg = data.message || "Statement processed successfully";
        setMessage(msg);
        toast.success(msg);
        window.dispatchEvent(new CustomEvent("statement-imported", { detail: data }));
        window.dispatchEvent(new CustomEvent("transaction-added", { detail: data }));
        onImportComplete?.(data);
      } else {
        throw new Error(data.message || "Statement import failed");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Statement import failed");
      toast.error(error.message || "Statement import failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            📄 Upload Payment Statement
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Import statements from <strong>Google Pay</strong> or <strong>PhonePe</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            Google Pay
          </span>
          <span className="rounded-full bg-purple-50 dark:bg-purple-950/50 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            PhonePe
          </span>
        </div>
      </div>

      {/* Upload Drop Zone */}
      {!previewData && status !== "success" && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileSelection(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
          }`}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFileSelection(e.target.files?.[0])}
          />
          <div className="text-4xl mb-3">⬆️</div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {isPreviewing ? "Analyzing statement headers..." : "Drag and drop your Google Pay or PhonePe CSV here"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">or click to browse file</p>
        </label>
      )}

      {/* Error Banner */}
      {status === "error" && (
        <div className="mt-4 rounded-2xl p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2">
          <span>⚠️</span>
          <div>
            <p className="font-bold">Import Warning</p>
            <p className="text-xs mt-0.5">{message}</p>
          </div>
        </div>
      )}

      {/* Statement Preview Card */}
      {previewData && status !== "success" && (
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Statement Detected</span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                {previewData.source === "PHONEPE" ? "🟣 PhonePe Statement" : "🟢 Google Pay Statement"}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400">Date Range</span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {previewData.dateRange?.start} → {previewData.dateRange?.end}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700/50">
              <p className="text-slate-400 font-semibold">Total Rows</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{previewData.totalRows}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Income ({previewData.incomeCount})</p>
              <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                {fmtCurrency(previewData.totalIncome)}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-100 dark:border-rose-900/50">
              <p className="text-rose-600 dark:text-rose-400 font-semibold">Expenses ({previewData.expenseCount})</p>
              <p className="text-base font-extrabold text-rose-700 dark:text-rose-300 mt-1">
                {fmtCurrency(previewData.totalExpense)}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3 border border-indigo-100 dark:border-indigo-900/50">
              <p className="text-indigo-600 dark:text-indigo-400 font-semibold">Net Balance</p>
              <p className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">
                {fmtCurrency(previewData.totalIncome - previewData.totalExpense)}
              </p>
            </div>
          </div>

          {/* Sample Preview Table */}
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
              Previewing first {previewData.previewTransactions?.length || 0} transactions:
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Person / Merchant</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-center">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewData.previewTransactions?.map((tx, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{tx.displayName}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.type === "income" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {tx.type === "income" ? "Income" : "Expense"}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-extrabold ${
                        tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {tx.type === "income" ? "+" : "-"}{fmtCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">
                        {new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={confirmImport}
              disabled={isUploading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isUploading ? "📥 Importing into Database..." : "🚀 Import Transactions"}
            </button>
            <button
              onClick={resetState}
              disabled={isUploading}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Result Card */}
      {status === "success" && importResult && (
        <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <span>✅</span> Import Completed
            </h4>
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold">
              Source: {importResult.source === "PHONEPE" ? "PhonePe" : "Google Pay"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800 text-center">
              <span className="text-slate-400 font-semibold block">Total</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                {importResult.summary?.totalRows || 0}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800 text-center">
              <span className="text-emerald-600 font-semibold block">Imported</span>
              <span className="font-extrabold text-emerald-700 text-sm">
                {importResult.summary?.imported || 0}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800 text-center">
              <span className="text-blue-600 font-semibold block">Income</span>
              <span className="font-extrabold text-blue-700 text-sm">
                {importResult.summary?.income || 0}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800 text-center">
              <span className="text-rose-600 font-semibold block">Expenses</span>
              <span className="font-extrabold text-rose-700 text-sm">
                {importResult.summary?.expenses || 0}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800 text-center">
              <span className="text-amber-600 font-semibold block">Duplicates</span>
              <span className="font-extrabold text-amber-700 text-sm">
                {importResult.summary?.duplicates || 0}
              </span>
            </div>
          </div>

          <button
            onClick={resetState}
            className="mt-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition cursor-pointer"
          >
            Upload Another Statement
          </button>
        </div>
      )}
    </div>
  );
};

export default StatementUploader;
