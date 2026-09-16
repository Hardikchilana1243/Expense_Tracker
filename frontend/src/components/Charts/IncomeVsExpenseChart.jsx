import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import SkeletonLoader from "../Cards/SkeletonLoader";

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const income  = payload.find((p) => p.dataKey === "income")?.value  || 0;
  const expense = payload.find((p) => p.dataKey === "expense")?.value || 0;
  const net = income - expense;

  return (
    <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl p-4 min-w-[160px] text-sm transition-colors">
      <p className="font-bold text-slate-700 dark:text-slate-100 mb-2 text-xs uppercase tracking-wide">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Income
          </span>
          <span className="font-semibold text-emerald-600">₹{income.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Expense
          </span>
          <span className="font-semibold text-rose-500">₹{expense.toLocaleString("en-IN")}</span>
        </div>
        <div className="border-t border-slate-100 pt-1.5 flex justify-between gap-4">
          <span className="text-slate-500">Net</span>
          <span className={`font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {net >= 0 ? "+" : ""}₹{net.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── Custom legend ── */
const CustomLegend = () => (
  <div className="flex items-center justify-center gap-5 mt-2 text-xs font-medium text-slate-600">
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Income
    </span>
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Expense
    </span>
  </div>
);

/* ══════════════════════════════════════════ */
const IncomeVsExpenseChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md transition-colors">
        <SkeletonLoader type="chart" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700
        flex flex-col items-center justify-center min-h-[420px] text-center transition-colors">
        <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-4xl">
          💹
        </div>
        <p className="text-slate-700 dark:text-slate-100 font-semibold text-lg">No Comparison Data</p>
        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1 max-w-xs">
          Add income and expenses to see a monthly comparison.
        </p>
      </div>
    );
  }

  /* Summary calculations */
  const totalIncome  = data.reduce((s, d) => s + (d.income  || 0), 0);
  const totalExpense = data.reduce((s, d) => s + (d.expense || 0), 0);
  const netBalance   = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Income vs Expense</h3>
          <p className="text-slate-400 text-xs mt-0.5">Monthly comparison — last {data.length} months</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          netBalance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
        }`}>
          {netBalance >= 0 ? "▲ Positive" : "▼ Deficit"}
        </span>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)", radius: 6 }} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="income"  fill="url(#incomeGrad)"  radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out" />
            <Bar dataKey="expense" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out" animationBegin={100} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wide mb-1">Total Income</p>
          <p className="text-emerald-700 font-extrabold text-sm">₹{totalIncome.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-rose-50 rounded-xl p-3 text-center">
          <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wide mb-1">Total Expense</p>
          <p className="text-rose-600 font-extrabold text-sm">₹{totalExpense.toLocaleString("en-IN")}</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${netBalance >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${netBalance >= 0 ? "text-blue-500" : "text-orange-500"}`}>
            Savings Rate
          </p>
          <p className={`font-extrabold text-sm ${netBalance >= 0 ? "text-blue-700" : "text-orange-600"}`}>
            {savingsRate}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(IncomeVsExpenseChart);
