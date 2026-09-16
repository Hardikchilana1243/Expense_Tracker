import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import SkeletonLoader from "../Cards/SkeletonLoader";

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label, average }) => {
  if (!active || !payload?.length) return null;
  const amount = payload[0]?.value || 0;
  const isAbove = amount > average;

  return (
    <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl p-3 text-sm min-w-[150px] transition-colors">
      <p className="text-slate-400 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="font-bold text-slate-800 dark:text-slate-100 text-base">₹{amount.toLocaleString("en-IN")}</p>
      <p className={`text-xs mt-1 font-medium ${isAbove ? "text-rose-500" : "text-emerald-500"}`}>
        {isAbove ? "▲ Above average" : "▼ Below average"}
      </p>
    </div>
  );
};

/* ── Custom Active Dot ── */
const CustomActiveDot = (props) => {
  const { cx, cy, fill } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={fill} stroke="white" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={10} fill={fill} fillOpacity={0.2} />
    </g>
  );
};

/* ══════════════════════════════════════════ */
const SpendingTrendsChart = ({ data, loading }) => {
  /* ── Loading ── */
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md transition-colors">
        <SkeletonLoader type="chart" />
      </div>
    );
  }

  /* ── Empty ── */
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700
        flex flex-col items-center justify-center min-h-[320px] text-center transition-colors">
        <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-4xl">
          📈
        </div>
        <p className="text-slate-700 dark:text-slate-100 font-semibold text-lg">No Spending Data</p>
        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1 max-w-xs">
          Add expenses in the last 30 days to see your spending trend.
        </p>
      </div>
    );
  }

  /* ── Computed statistics ── */
  const amounts  = data.map((d) => d.amount);
  const total    = amounts.reduce((s, a) => s + a, 0);
  const average  = total / Math.max(data.length, 1);
  const maxDay   = data.reduce((m, d) => (d.amount > m.amount ? d : m), data[0]);
  const minDay   = data.reduce((m, d) => (d.amount < m.amount ? d : m), data[0]);

  /* Cumulative */
  const chartData = useMemo(() =>
    data.map((item, i) => ({
      ...item,
      cumulative: data.slice(0, i + 1).reduce((s, d) => s + d.amount, 0),
    })),
  [data]);

  /* Trend direction (last 7 vs prior 7 days) */
  const last7   = data.slice(-7).reduce((s, d) => s + d.amount, 0);
  const prior7  = data.slice(-14, -7).reduce((s, d) => s + d.amount, 0);
  const trendUp = last7 > prior7;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Spending Trends</h3>
          <p className="text-slate-400 text-xs mt-0.5">Daily spending — last 30 days</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            trendUp ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
          }`}>
            {trendUp ? "▲ Trending up" : "▼ Trending down"}
          </span>
          <span className="bg-blue-50 text-blue-500 text-xs font-semibold px-3 py-1 rounded-full">
            Avg ₹{average.toLocaleString("en-IN", { maximumFractionDigits: 0 })} /day
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Blue gradient for daily spending */}
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
              {/* Amber gradient for cumulative */}
              <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
              width={50}
            />
            <Tooltip content={<CustomTooltip average={average} />} />

            {/* Average reference line */}
            <ReferenceLine
              y={average}
              stroke="#94a3b8"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: "Avg", position: "right", fill: "#94a3b8", fontSize: 10 }}
            />

            {/* Cumulative area (behind) */}
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#f59e0b"
              strokeWidth={1.5}
              fill="url(#cumulGrad)"
              dot={false}
              activeDot={false}
              animationDuration={800}
              animationEasing="ease-out"
              name="Cumulative"
            />

            {/* Daily spending area (front) */}
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#spendGrad)"
              dot={false}
              activeDot={<CustomActiveDot fill="#6366f1" />}
              animationDuration={700}
              animationEasing="ease-out"
              name="Daily Spending"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-1 mb-4 text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-indigo-500 inline-block rounded" /> Daily Spending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-amber-400 inline-block rounded" style={{borderStyle:"dashed"}} /> Cumulative
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-slate-400 inline-block rounded" style={{borderStyle:"dashed"}} /> Average
        </span>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Avg / Day",    value: `₹${average.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "blue"   },
          { label: "Total Spent",  value: `₹${total.toLocaleString("en-IN")}`,                                  color: "indigo" },
          { label: "Peak Day",     value: `₹${maxDay.amount.toLocaleString("en-IN")}`,                          sub: maxDay.date,   color: "rose"   },
          { label: "Lowest Day",   value: `₹${minDay.amount.toLocaleString("en-IN")}`,                          sub: minDay.date,   color: "emerald"},
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={`bg-${color}-50 rounded-xl p-3`}>
            <p className={`text-${color}-500 text-[10px] font-bold uppercase tracking-wide`}>{label}</p>
            <p className={`text-${color}-700 font-extrabold text-sm mt-1`}>{value}</p>
            {sub && <p className="text-slate-400 text-[10px] mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SpendingTrendsChart);
