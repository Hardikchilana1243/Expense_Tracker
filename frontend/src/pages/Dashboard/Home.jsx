import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";
import ExpenseByCategoryChart from "../../components/Charts/ExpenseByCategoryChart";
import IncomeVsExpenseChart from "../../components/Charts/IncomeVsExpenseChart";
import SpendingTrendsChart from "../../components/Charts/SpendingTrendsChart";
import StatCard from "../../components/Cards/StatCard";
import SkeletonLoader from "../../components/Cards/SkeletonLoader";
import BudgetAlertsWidget from "../../components/Cards/BudgetAlertsWidget";
import InsightCard from "../../components/Cards/InsightCard";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils";
import { motion as Motion } from "framer-motion";
import toast from "react-hot-toast";

/* ─── Transaction type icon & color map ─── */
const txIcon  = (type) => (type === "income" ? "💰" : "💸");
const txColor = (type) =>
  type === "income"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-600";

/* ─── Currency formatter (INR) ─── */
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n || 0);

/* ─── Date formatter ─── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/* ══════════════════════════════════════════════════════════ */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState({
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
  });
  const [summaryStats, setSummaryStats] = useState({
    thisMonthExpense: 0,
    thisMonthIncome: 0,
    lastMonthExpense: 0,
    highestCategory: "N/A",
    highestCategoryAmount: 0,
  });
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [incomeVsExpense, setIncomeVsExpense]       = useState([]);
  const [spendingTrends, setSpendingTrends]         = useState([]);
  const [transactions, setTransactions]             = useState([]);
  const [budgetAlerts, setBudgetAlerts]             = useState([]);
  const [insights, setInsights]                     = useState([]);
  const [advisorSummary, setAdvisorSummary]         = useState(null);
  const [advisorRecommendations, setAdvisorRecommendations] = useState([]);
  const [advisorForecast, setAdvisorForecast]       = useState(null);
  const [advisorHealth, setAdvisorHealth]           = useState(null);

  const [loading, setLoading]           = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError]               = useState(null);

  /* ── Build auth headers ── */
  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
  }), []);

  /* ── Fetch primary dashboard data (consolidated overview) ── */
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) { setLoading(false); setChartsLoading(false); return; }
    try {
      setLoading(true);
      setChartsLoading(true);
      setError(null);
      const opts = { headers: authHeaders(), credentials: "include" };

      const [ovRes, alertRes, insightRes, advisorSummaryRes, advisorRecRes, advisorForecastRes, advisorHealthRes] = await Promise.all([
        fetch(API_ENDPOINTS.DASHBOARD.OVERVIEW(user.id), opts),
        fetch(API_ENDPOINTS.BUDGET.ALERTS(user.id), opts),
        fetch(API_ENDPOINTS.INSIGHTS.GET_ALL(user.id), opts),
        fetch(API_ENDPOINTS.AI_ADVISOR.SUMMARY(user.id), opts),
        fetch(API_ENDPOINTS.AI_ADVISOR.RECOMMENDATIONS(user.id), opts),
        fetch(API_ENDPOINTS.AI_ADVISOR.FORECAST(user.id), opts),
        fetch(API_ENDPOINTS.AI_ADVISOR.HEALTH(user.id), opts),
      ]);

      if (ovRes.ok) {
        const ovData = await ovRes.json();
        const data = ovData?.data || {};
        setSummary(data.summary || { totalBalance: 0, totalIncome: 0, totalExpense: 0 });
        setSummaryStats(data.summaryStats || { thisMonthExpense: 0, thisMonthIncome: 0, lastMonthExpense: 0, highestCategory: "N/A", highestCategoryAmount: 0 });
        setExpensesByCategory(Array.isArray(data.expensesByCategory) ? data.expensesByCategory : []);
        setIncomeVsExpense(Array.isArray(data.incomeVsExpense) ? data.incomeVsExpense : []);
        setSpendingTrends(Array.isArray(data.spendingTrends) ? data.spendingTrends : []);
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      }

      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setBudgetAlerts(Array.isArray(alertData?.data) ? alertData.data : []);
      }
      if (insightRes.ok) {
        const insightData = await insightRes.json();
        setInsights(Array.isArray(insightData?.data) ? insightData.data : []);
      }
      if (advisorSummaryRes.ok) {
        const advisorData = await advisorSummaryRes.json();
        setAdvisorSummary(advisorData?.data || null);
      }
      if (advisorRecRes.ok) {
        const recData = await advisorRecRes.json();
        setAdvisorRecommendations(Array.isArray(recData?.data) ? recData.data : []);
      }
      if (advisorForecastRes.ok) {
        const forecastData = await advisorForecastRes.json();
        setAdvisorForecast(forecastData?.data || null);
      }
      if (advisorHealthRes.ok) {
        const healthData = await advisorHealthRes.json();
        setAdvisorHealth(healthData?.data || null);
      }
    } catch (err) {
      setError(err.message);
      console.error("Dashboard overview data error:", err);
    } finally {
      setLoading(false);
      setChartsLoading(false);
    }
  }, [user?.id, authHeaders]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    const refreshDashboard = () => {
      fetchDashboardData();
    };

    window.addEventListener("statement-imported", refreshDashboard);
    window.addEventListener("transaction-added", refreshDashboard);
    return () => {
      window.removeEventListener("statement-imported", refreshDashboard);
      window.removeEventListener("transaction-added", refreshDashboard);
    };
  }, [fetchDashboardData]);

  /* ── Derived values (Memoized) ── */
  const savingsPct = React.useMemo(() => {
    return summary.totalIncome > 0
      ? Math.max(0, ((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100)
      : 0;
  }, [summary.totalIncome, summary.totalExpense]);

  const expensePct = React.useMemo(() => {
    return summary.totalIncome > 0
      ? Math.min(100, (summary.totalExpense / summary.totalIncome) * 100)
      : 0;
  }, [summary.totalIncome, summary.totalExpense]);

  const monthlyChange = React.useMemo(() => {
    return summaryStats.lastMonthExpense > 0
      ? (
          ((summaryStats.thisMonthExpense - summaryStats.lastMonthExpense) /
            summaryStats.lastMonthExpense) *
          100
        ).toFixed(1)
      : null;
  }, [summaryStats.thisMonthExpense, summaryStats.lastMonthExpense]);

  /* ── Full-page loading (first load before user context) ── */
  if (loading && !user) {
    return (
      <DashboardLayout activeMenu="Dashboard">
        <div className="p-6 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl animate-spin mb-4">💫</div>
            <p className="text-slate-500 font-medium">Loading your dashboard…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ──────────────────────────────────────────────────────── */
  return (
    <DashboardLayout activeMenu="Dashboard">
      <Motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-5 md:p-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 min-h-screen dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900/20 transition-colors"
      >
        {/* ── Hero header ── */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white leading-tight">
                Hi, {user?.fullName?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="text-slate-500 mt-1 text-sm md:text-base">
                Here's your financial snapshot — {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}
              </p>
            </div>
            {/* Savings pill */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm border
              ${savingsPct >= 20
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : savingsPct >= 5
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-rose-50 text-rose-600 border-rose-200"}`}>
              {savingsPct >= 20 ? "🎯" : savingsPct >= 5 ? "⚠️" : "🔴"}
              Savings rate: {savingsPct.toFixed(1)}%
            </div>
            
            {/* Export Buttons */}
            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
              <button 
                onClick={() => exportToCSV(transactions)}
                className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-200 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
              >
                📊 CSV
              </button>
              <button 
                onClick={() => exportToPDF(user, transactions, { ...summary, categoryData: expensesByCategory }, {
                  summary: advisorSummary?.summary || null,
                  forecast: advisorForecast || null,
                  financialHealth: advisorHealth || null,
                  recommendations: advisorRecommendations || [],
                })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
              >
                📄 PDF Report
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 mb-8 xl:grid-cols-[1fr_360px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20 transition-colors">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">Profile preview</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{user?.fullName || "Your profile"}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Quick access to your account settings, latest activity, and profile management.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                View profile
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{user?.email || "No email"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Since</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{new Date(user?.createdAt || new Date()).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{user?.isPremium ? "Premium" : "Standard"}</p>
              </div>
            </div>
          </div> 
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20 transition-colors flex items-center gap-4">
            <div className="h-24 w-24 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-4xl font-bold shadow-xl">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Latest login</p>
              <p className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">{new Date(user?.lastLogin || user?.updatedAt || new Date()).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Access your profile, security, and preferences quickly.</p>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-shake">
            <span className="text-rose-500 text-lg mt-0.5">⚠️</span>
            <div>
              <p className="text-rose-700 font-semibold text-sm">Something went wrong</p>
              <p className="text-rose-500 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Top stat cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {loading ? (
            <>
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </>
          ) : (
            <>
              <div className="animate-slide-in-left" style={{ animationDelay: "0.05s" }}>
                <StatCard
                  icon="💰"
                  label="Total Balance"
                  value={fmt(summary.totalBalance)}
                  bgGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                  trend={`${savingsPct.toFixed(1)}% savings rate`}
                  trendUp={summary.totalBalance >= 0}
                  progress={savingsPct}
                  subValue="Across all time"
                />
              </div>
              <div className="animate-slide-in-up" style={{ animationDelay: "0.1s" }}>
                <StatCard
                  icon="📈"
                  label="Total Income"
                  value={fmt(summary.totalIncome)}
                  bgGradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                  trend="All-time earnings"
                  trendUp={true}
                  progress={100}
                  subValue="Base for savings calculation"
                />
              </div>
              <div className="animate-slide-in-right" style={{ animationDelay: "0.15s" }}>
                <StatCard
                  icon="📉"
                  label="Total Expenses"
                  value={fmt(summary.totalExpense)}
                  bgGradient="bg-gradient-to-br from-rose-500 to-red-600"
                  trend={`${expensePct.toFixed(1)}% of income spent`}
                  trendUp={false}
                  progress={expensePct}
                  subValue="All-time expenditure"
                />
              </div>
            </>
          )}
        </div>

        {/* ── Quick stats strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {chartsLoading ? (
            <>
              <SkeletonLoader type="quick-stat" />
              <SkeletonLoader type="quick-stat" />
              <SkeletonLoader type="quick-stat" />
              <SkeletonLoader type="quick-stat" />
            </>
          ) : (
            <>
              {/* This month expense */}
              <div className="bg-white dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-slate-400 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">This Month Spent</p>
                <p className="text-2xl font-extrabold text-rose-500">
                  ₹{(summaryStats.thisMonthExpense || 0).toLocaleString("en-IN")}
                </p>
                {monthlyChange !== null && (
                  <p className={`text-xs mt-1.5 font-semibold ${+monthlyChange > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                    {+monthlyChange > 0 ? "▲" : "▼"} {Math.abs(monthlyChange)}% vs last month
                  </p>
                )}
              </div>

              {/* This month income */}
              <div className="bg-white dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-slate-400 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">This Month Income</p>
                <p className="text-2xl font-extrabold text-emerald-600">
                  ₹{(summaryStats.thisMonthIncome || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs mt-1.5 text-slate-400 dark:text-slate-400">Tracked this month</p>
              </div>

              {/* Highest category */}
              <div className="bg-white dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-slate-400 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Top Category</p>
                <p className="text-2xl font-extrabold text-amber-600 truncate">
                  {summaryStats.highestCategory || "N/A"}
                </p>
                <p className="text-xs mt-1.5 text-slate-400 dark:text-slate-400">
                  ₹{(summaryStats.highestCategoryAmount || 0).toLocaleString("en-IN")} total
                </p>
              </div>

              {/* Savings rate */}
              <div className="bg-white dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-slate-400 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Savings Rate</p>
                <p className="text-2xl font-extrabold text-blue-600">{savingsPct.toFixed(1)}%</p>
                <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(savingsPct, 100)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Alerts Row ── */}
        <div className="mb-6 animate-slide-in-up" style={{ animationDelay: "0.15s" }}>
          <BudgetAlertsWidget alerts={budgetAlerts} loading={chartsLoading} />
        </div>

        {/* ── AI Financial Advisor ── */}
        <div className="mb-6 animate-slide-in-up" style={{ animationDelay: "0.18s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-2xl">🤖</span> Finance AI Advisor
            </h3>
            <span className="bg-violet-50 text-violet-600 text-xs font-semibold px-3 py-1 rounded-full">
              Live from MongoDB
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Financial Health</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{advisorHealth?.score ?? "—"}/100</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{advisorHealth?.status ?? "Evaluating"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Savings Prediction</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">{fmt(advisorForecast?.expectedSavings ?? 0)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Projected at month-end</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Top Merchant</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{advisorSummary?.analytics?.highestSpendingMerchant?.merchant || "—"}</p>
                  <p className="text-sm text-slate-500">{advisorSummary?.analytics?.highestSpendingMerchant?.count ?? 0} activity points</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Most Frequent Category</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{advisorSummary?.analytics?.mostFrequentCategory?.category || "—"}</p>
                  <p className="text-sm text-slate-500">{advisorSummary?.analytics?.mostFrequentCategory?.count ?? 0} entries</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-100">Monthly Forecast</p>
              <p className="mt-3 text-3xl font-bold">{fmt(advisorForecast?.projectedExpense ?? 0)}</p>
              <p className="mt-2 text-sm text-violet-100">Projected end-of-month expense with {advisorForecast?.confidence ?? 0}% confidence</p>
              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span>Expected Income</span><span>{fmt(advisorForecast?.expectedIncome ?? 0)}</span></div>
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span>Expected Balance</span><span>{fmt(advisorForecast?.expectedBalance ?? 0)}</span></div>
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2"><span>Expected Savings</span><span>{fmt(advisorForecast?.expectedSavings ?? 0)}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {advisorRecommendations.length > 0 ? advisorRecommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-[0.24em] text-indigo-500">{recommendation.impact}</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{recommendation.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{recommendation.message}</p>
              </div>
            )) : <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">Recommendation engine is warming up; add a few more transactions to unlock richer advice.</div>}
          </div>
        </div>

        {/* ── Smart Insights ── */}
        <div className="mb-6 animate-slide-in-up" style={{ animationDelay: "0.18s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-2xl">🧠</span> Smart Insights
            </h3>
            <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
              AI Analysis
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {chartsLoading ? (
              <>
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
              </>
            ) : insights.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors">
                <p className="text-slate-500 dark:text-slate-400">Not enough data to generate insights yet. Keep tracking your expenses!</p>
              </div>
            ) : (
              insights.map((insight, idx) => (
                <InsightCard key={insight.id || idx} insight={insight} />
              ))
            )}
          </div>
        </div>

        {/* ── Charts row (Pie + Bar) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="animate-slide-in-left" style={{ animationDelay: "0.2s" }}>
            <ExpenseByCategoryChart data={expensesByCategory} loading={chartsLoading} />
          </div>
          <div className="animate-slide-in-right" style={{ animationDelay: "0.3s" }}>
            <IncomeVsExpenseChart data={incomeVsExpense} loading={chartsLoading} />
          </div>
        </div>

        {/* ── Spending Trends (full width) ── */}
        <div className="mb-6 animate-slide-in-up" style={{ animationDelay: "0.4s" }}>
          <SpendingTrendsChart data={spendingTrends} loading={chartsLoading} />
        </div>

        {/* ── Recent Transactions ── */}
        <div
          className="bg-white dark:bg-slate-950 dark:border-slate-800 rounded-2xl shadow-sm border border-slate-100 p-6 animate-slide-in-up hover:shadow-md transition-shadow"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Transactions</h3>
              <p className="text-slate-400 text-xs mt-0.5">Your last 10 financial activities</p>
            </div>
            {transactions.length > 0 && (
              <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
                {transactions.length} entries
              </span>
            )}
          </div>

          {/* Loading rows */}
          {loading ? (
            <table className="w-full text-sm">
              <tbody>
                <SkeletonLoader type="table-row" count={5} />
              </tbody>
            </table>
          ) : transactions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-4">
                📭
              </div>
              <p className="text-slate-600 font-semibold">No transactions yet</p>
              <p className="text-slate-400 text-sm mt-1">Start by adding income or expenses from the sidebar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Type", "Description", "Category / Source", "Amount", "Date"].map((h) => (
                      <th
                        key={h}
                        className={`py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest
                          ${h === "Amount" ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr
                      key={tx._id || idx}
                      className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* Type badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${txColor(tx.type)}`}>
                          {txIcon(tx.type)}
                          {tx.type === "income" ? "Income" : "Expense"}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[180px] truncate">
                        {tx.description || "—"}
                      </td>

                      {/* Category / source */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md font-medium">
                            {tx.category || tx.source || "—"}
                          </span>
                          {tx.isImported && (
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                              🏦 Bank Synced
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className={`py-3.5 px-4 font-bold text-right text-base
                        ${tx.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                        {tx.type === "income" ? "+" : "−"}{fmt(tx.amount)}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                        {fmtDate(tx.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Motion.div>
    </DashboardLayout>
  );
};

export default Home;
