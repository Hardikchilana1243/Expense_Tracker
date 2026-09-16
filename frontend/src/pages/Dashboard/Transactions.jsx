import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n || 0);

const getCategoryIcon = (categoryStr = "") => {
  const lower = String(categoryStr || "").toLowerCase();
  if (lower.includes("person") || lower.includes("transfer")) return "👤";
  if (lower.includes("food") || lower.includes("dining")) return "🍴";
  if (lower.includes("grocery") || lower.includes("groceries")) return "🛒";
  if (lower.includes("shopping") || lower.includes("apparel") || lower.includes("clothes")) return "🛍️";
  if (lower.includes("transport") || lower.includes("cab") || lower.includes("fuel")) return "🚗";
  if (lower.includes("medical") || lower.includes("health")) return "🏥";
  if (lower.includes("education") || lower.includes("book") || lower.includes("course")) return "🎓";
  if (lower.includes("entertainment") || lower.includes("movie") || lower.includes("game")) return "🎮";
  if (lower.includes("utility") || lower.includes("recharge") || lower.includes("bill")) return "💡";
  if (lower.includes("rent")) return "🏠";
  if (lower.includes("travel") || lower.includes("flight")) return "✈️";
  if (lower.includes("salary")) return "💼";
  if (lower.includes("freelance")) return "💻";
  if (lower.includes("cashback") || lower.includes("reward")) return "🎁";
  if (lower.includes("refund")) return "🔄";
  if (lower.includes("investment")) return "📈";
  return "📁";
};

const Transactions = () => {
  const { user, refreshSession } = useAuth();
  const [bankAccount, setBankAccount] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("latest");

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 when filters or debounced search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, sort]);

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(type !== "all" && { type }),
      }).toString();

      const url = `${API_ENDPOINTS.TRANSACTIONS.GET_ALL(user.id)}?${queryParams}`;
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setTransactions(Array.isArray(data?.data) ? data.data : []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Fetch transactions error:", err);
      toast.error("Could not load transactions");
      setTransactions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, limit, debouncedSearch, type, sort]);

  const fetchBankAccount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(API_ENDPOINTS.MOCK.GET(user.id), {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBankAccount(data?.bankAccount || null);
    } catch (err) {
      console.error("Fetch bank account error:", err);
      setBankAccount(null);
    }
  }, [user?.id]);

  const handleImport = async () => {
    if (!bankAccount || !bankAccount.accountNumber) {
      toast.error("No linked bank account. Link one in Profile.");
      return;
    }

    setImportLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.MOCK.IMPORT(user.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await res.json();

      if (data?.success !== false) {
        toast.success(data?.message || "Transactions imported!");
        await fetchTransactions();
        await fetchBankAccount();
        if (data?.bankAccount && user) {
          await refreshSession();
        }
      } else {
        toast.error(data?.message || "Import failed");
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Failed to connect to bank server");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDelete = async (id, txType) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch(API_ENDPOINTS.TRANSACTIONS.DELETE(user.id, txType, id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Transaction deleted");
        if (transactions.length === 1 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        } else {
          await fetchTransactions();
        }
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Delete failed");
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
      fetchBankAccount();
    }
  }, [user?.id, fetchTransactions, fetchBankAccount]);

  useEffect(() => {
    const refreshAfterImport = () => {
      fetchTransactions();
      fetchBankAccount();
    };

    window.addEventListener("statement-imported", refreshAfterImport);
    window.addEventListener("transaction-added", refreshAfterImport);
    return () => {
      window.removeEventListener("statement-imported", refreshAfterImport);
      window.removeEventListener("transaction-added", refreshAfterImport);
    };
  }, [fetchTransactions, fetchBankAccount]);

  if (!user) {
    return (
      <DashboardLayout activeMenu="Transactions">
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading user profile...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeMenu="Transactions">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 md:p-8 min-h-screen space-y-6 bg-slate-50/50 dark:bg-slate-950 transition-colors"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              💳 Transactions
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Search, filter, and audit your financial history
            </p>
          </div>
        </div>

        {/* Bank Sync Card */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-indigo-950 dark:text-indigo-200 mb-1 flex items-center gap-2">
                <span>🏦</span> Bank Sync
              </h2>
              <p className="text-indigo-700 dark:text-indigo-300 text-sm mb-2">
                Import real transactions from your linked bank account
              </p>
              {bankAccount && bankAccount.accountNumber ? (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50 inline-block">
                  ✅ Linked: ****{bankAccount.accountNumber.slice(-4)} - {bankAccount.bankName}
                </p>
              ) : (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-900/50 inline-block">
                  ⚠️ <a href="/profile" className="underline font-bold hover:text-amber-800 dark:hover:text-amber-200">Link account in Profile</a>
                </p>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={importLoading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {importLoading ? "🔄 Syncing..." : "💳 Import from Bank"}
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center transition-colors"
        >
          <div className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              placeholder="🔍 Search description, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 outline-none min-w-[130px] transition-all cursor-pointer"
          >
            <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">All Types</option>
            <option value="income" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Income</option>
            <option value="expense" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Expense</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 outline-none min-w-[150px] transition-all cursor-pointer"
          >
            <option value="latest" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Latest First</option>
            <option value="oldest" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Oldest First</option>
            <option value="amount_desc" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Highest Amount</option>
            <option value="amount_asc" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Lowest Amount</option>
          </select>
        </motion.div>

        {/* Table / List */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left">Transaction</th>
                  <th className="px-6 py-4 text-left">Category</th>
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Source</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center bg-white dark:bg-slate-900">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Loading transactions...</p>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center bg-white dark:bg-slate-900">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
                        {debouncedSearch ? "No matching transactions found" : "No transactions found"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {debouncedSearch ? "Try adjusting your search query or filter." : "Click 'Import from Bank' or add transactions manually."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group bg-white dark:bg-slate-900"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shadow-sm shrink-0 ${
                              tx.type === "income"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                                : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                            }`}
                          >
                            {tx.type === "income" ? "💰" : "💸"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">
                              {tx.description || "Transaction"}
                            </p>
                            {tx.note && <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{tx.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full font-semibold border border-slate-200/50 dark:border-slate-700/50 inline-flex items-center gap-1.5">
                          {getCategoryIcon(tx.category || tx.source)} {tx.category || tx.source || "Other"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-base font-extrabold tracking-tight ${
                            tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}{fmtCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {tx.isImported ? (
                          <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                            tx.source === "PHONEPE"
                              ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900"
                              : tx.source === "GOOGLE_PAY"
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                              : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
                          }`}>
                            {tx.source === "PHONEPE" ? "🟣 PHONEPE" : tx.source === "GOOGLE_PAY" ? "📱 GOOGLE PAY" : "📄 CSV IMPORT"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] rounded-full font-medium border border-slate-200/40 dark:border-slate-700/40">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(tx._id, tx.type)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                          title="Delete transaction"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Showing page <strong className="text-slate-900 dark:text-white">{page}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-40 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Transactions;
