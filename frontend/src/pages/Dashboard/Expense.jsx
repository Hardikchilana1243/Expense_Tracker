import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const Expense = () => {
  const { user } = useAuth();
  const [expensesList, setExpensesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [totalExpense, setTotalExpense] = useState(0);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("latest");

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    mode: "selected", // "selected" | "single" | "filtered"
    targetId: null,
    count: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    paymentMethod: "upi",
  });

  const categories = [
    "🍜 Food",
    "🛒 Groceries",
    "👤 Person / Transfer",
    "🛍️ Shopping",
    "🚗 Transportation",
    "🏥 Medical",
    "🎓 Education",
    "🎮 Entertainment",
    "💡 Utilities",
    "🏠 Rent",
    "✈️ Travel",
    "💸 Bills",
    "📁 Other",
  ];

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page to 1 on filter/search change
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, categoryFilter, dateRange, dateFrom, dateTo, sort]);

  const hasActiveFilters = useMemo(() => {
    return (
      debouncedSearch !== "" ||
      categoryFilter !== "all" ||
      dateRange !== "all" ||
      sort !== "latest" ||
      dateFrom !== "" ||
      dateTo !== ""
    );
  }, [debouncedSearch, categoryFilter, dateRange, sort, dateFrom, dateTo]);

  const fetchExpenses = useCallback(async () => {
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
        ...(categoryFilter !== "all" && { category: categoryFilter }),
        ...(dateRange !== "all" && { dateRange }),
        ...(dateRange === "custom" && dateFrom && { dateFrom }),
        ...(dateRange === "custom" && dateTo && { dateTo }),
      }).toString();

      const res = await fetch(`${API_ENDPOINTS.EXPENSES.GET_ALL(user.id)}?${queryParams}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch expense records");
      const data = await res.json();

      if (data?.data && Array.isArray(data.data)) {
        setExpensesList(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || 0);
        setTotalExpense(data.totalExpense || 0);
      } else {
        setExpensesList(Array.isArray(data) ? data : []);
        setTotalPages(1);
        setTotalItems(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error("fetchExpenses error:", err);
      toast.error(err.message || "Failed to load expenses");
      setExpensesList([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, limit, debouncedSearch, categoryFilter, dateRange, dateFrom, dateTo, sort]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    const refreshExpenses = () => fetchExpenses();
    window.addEventListener("statement-imported", refreshExpenses);
    window.addEventListener("transaction-added", refreshExpenses);
    return () => {
      window.removeEventListener("statement-imported", refreshExpenses);
      window.removeEventListener("transaction-added", refreshExpenses);
    };
  }, [fetchExpenses]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setCategoryFilter("all");
    setDateRange("all");
    setDateFrom("");
    setDateTo("");
    setSort("latest");
    setPage(1);
    setSelectedIds([]);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.amount) {
      toast.error("Category and Amount are required");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.EXPENSES.ADD(user.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          paymentMethod: formData.paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to add expense");

      toast.success("Expense recorded successfully");
      setFormData({ category: "", amount: "", description: "", paymentMethod: "upi" });
      setShowForm(false);
      window.dispatchEvent(new CustomEvent("transaction-added", { detail: data }));
      fetchExpenses();
    } catch (err) {
      console.error("handleAddExpense error:", err);
      toast.error(err.message || "Failed to add expense");
    }
  };

  // Checkbox Selection Logic
  const allVisibleSelected = useMemo(() => {
    if (expensesList.length === 0) return false;
    return expensesList.every((item) => selectedIds.includes(item._id));
  }, [expensesList, selectedIds]);

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(expensesList.map((item) => item._id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...expensesList.map((item) => item._id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Modal Open Handlers
  const openSingleDelete = (id) => {
    setDeleteModal({ open: true, mode: "single", targetId: id, count: 1 });
  };

  const openSelectedDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteModal({ open: true, mode: "selected", targetId: null, count: selectedIds.length });
  };

  const openFilteredDelete = () => {
    setDeleteModal({ open: true, mode: "filtered", targetId: null, count: totalItems });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, mode: "selected", targetId: null, count: 0 });
  };

  // Perform Bulk / Single / Filtered Deletion
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      let endpoint = "";
      let options = {};

      if (deleteModal.mode === "single") {
        endpoint = API_ENDPOINTS.EXPENSES.DELETE(deleteModal.targetId, user.id);
        options = { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include" };
      } else if (deleteModal.mode === "selected") {
        endpoint = API_ENDPOINTS.EXPENSES.DELETE_BULK;
        options = {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids: selectedIds }),
        };
      } else if (deleteModal.mode === "filtered") {
        endpoint = API_ENDPOINTS.EXPENSES.DELETE_FILTERED;
        options = {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            search: debouncedSearch,
            category: categoryFilter,
            dateRange,
            dateFrom,
            dateTo,
          }),
        };
      }

      const res = await fetch(endpoint, options);
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete records");
      }

      const count = data.deletedCount || deleteModal.count || 1;
      toast.success(`${count} expense ${count === 1 ? "record" : "records"} deleted successfully.`);

      setSelectedIds([]);
      closeDeleteModal();
      window.dispatchEvent(new CustomEvent("transaction-added", { detail: data }));

      // Adjust page if current page becomes empty
      if (expensesList.length <= (deleteModal.mode === "single" ? 1 : selectedIds.length) && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await fetchExpenses();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete expense records");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Expense">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 md:p-8 min-h-screen space-y-6 bg-slate-50/50 dark:bg-slate-950 transition-colors"
      >
        {/* Header & Total Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              💸 Expense Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Audit and monitor your spending across categories
            </p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 px-6 py-4 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Total Outflow
            </p>
            <h2 className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">
              {fmtCurrency(totalExpense)}
            </h2>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4 transition-colors"
        >
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="🔍 Search expense category, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all cursor-pointer"
            >
              <option value="all">📅 All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all cursor-pointer"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Highest Amount</option>
              <option value="amount_low">Lowest Amount</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                🔄 Reset Filters
              </button>
            )}

            {/* Add Expense Toggle Button */}
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer ml-auto"
            >
              {showForm ? "❌ Close Form" : "➕ Add Expense"}
            </button>
          </div>

          {/* Custom Date Inputs if Custom Selected */}
          {dateRange === "custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          )}

          {/* Bulk Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                />
                Select All ({expensesList.length})
              </label>

              {selectedIds.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-extrabold text-xs">
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={openSelectedDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  🗑️ Delete Selected ({selectedIds.length})
                </button>
              )}

              {hasActiveFilters && totalItems > 0 && selectedIds.length === 0 && (
                <button
                  onClick={openFilteredDelete}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  ⚠️ Delete All Filtered ({totalItems})
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Add Expense Form Box */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-6 transition-colors"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span>💸</span> Record Expense Item
            </h2>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Amount * (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1250"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all cursor-pointer"
                >
                  <option value="upi">UPI</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="net_banking">Net Banking</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1.5">
                  Description / Note
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  💾 Save Expense
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Expense Table List */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left">Expense Item</th>
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
                    <td colSpan="7" className="p-12 text-center bg-white dark:bg-slate-900">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 dark:border-rose-400"></div>
                      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Loading expense records...</p>
                    </td>
                  </tr>
                ) : expensesList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center bg-white dark:bg-slate-900">
                      <div className="text-4xl mb-3">💸</div>
                      <p className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
                        {hasActiveFilters ? "No expense records match your current filters." : "No expense records added yet."}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {hasActiveFilters ? "Try resetting your search query or filters." : "Click 'Add Expense' or sync your bank account."}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  expensesList.map((item) => {
                    const isSelected = selectedIds.includes(item._id);
                    return (
                      <tr
                        key={item._id}
                        className={`transition-colors group ${
                          isSelected
                            ? "bg-rose-50/60 dark:bg-rose-950/30"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectId(item._id)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-base font-bold shrink-0">
                              💸
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">
                                {item.category || "Expense"}
                              </p>
                              {item.description && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full font-semibold border border-slate-200/50 dark:border-slate-700/50">
                            {item.category || "General"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-base font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                            -{fmtCurrency(item.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.isImported ? (
                            <span className="inline-flex px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-full border border-indigo-200 dark:border-indigo-900">
                              🏦 BANK IMPORT
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] rounded-full font-medium border border-slate-200/40 dark:border-slate-700/40">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openSingleDelete(item._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                            title="Delete expense"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing <strong>{(page - 1) * limit + 1}</strong> to <strong>{Math.min(page * limit, totalItems)}</strong> of <strong>{totalItems}</strong> entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ◀ Previous
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {deleteModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-2xl border border-rose-200 dark:border-rose-900">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Confirm Deletion
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {deleteModal.mode === "filtered"
                    ? `Are you sure you want to delete all ${deleteModal.count} expense records matching your active filters?`
                    : deleteModal.mode === "selected"
                    ? `Are you sure you want to delete ${deleteModal.count} selected expense ${deleteModal.count === 1 ? "item" : "items"}?`
                    : "Are you sure you want to delete this expense record?"}
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isDeleting ? "Deleting..." : `Delete (${deleteModal.count})`}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
};

export default Expense;