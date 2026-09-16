import React, { useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import SkeletonLoader from "../Cards/SkeletonLoader";

/* ── Curated color palette ── */
const COLORS = [
  "#6366f1", // indigo
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#a855f7", // purple
  "#14b8a6", // teal
  "#fb923c", // orange
  "#ec4899", // pink
  "#84cc16", // lime
];

/* ── Animated active slice on hover ── */
const renderActiveShape = (props) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;

return (
  <g>
    {/* Center label */}
    <text x={cx} y={cy - 12} textAnchor="middle" fill="#1e293b" className="text-base font-bold" fontSize={14} fontWeight={700}>
      {payload.name}
    </text>
    <text x={cx} y={cy + 14} textAnchor="middle" fill="#6366f1" fontSize={16} fontWeight={800}>
      ₹{value.toLocaleString("en-IN")}
    </text>
    <text x={cx} y={cy + 34} textAnchor="middle" fill="#94a3b8" fontSize={11}>
      {(percent * 100).toFixed(1)}%
    </text>

    {/* Expanded outer arc */}
    <Sector
      cx={cx} cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 10}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
    {/* Glow ring */}
    <Sector
      cx={cx} cy={cy}
      innerRadius={outerRadius + 14}
      outerRadius={outerRadius + 18}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      opacity={0.4}
    />
  </g>
);
};

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload, total }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
  return (
    <div className="bg-white dark:bg-slate-900 dark:border-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl p-3 text-sm transition-colors">
      <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{name}</p>
      <p className="text-slate-500 dark:text-slate-400">Amount: <span className="font-semibold text-slate-800 dark:text-slate-100">₹{value.toLocaleString("en-IN")}</span></p>
      <p className="text-slate-500 dark:text-slate-400">Share: <span className="font-semibold text-indigo-600">{pct}%</span></p>
    </div>
  );
};

/* ══════════════════════════════════════════ */
const ExpenseByCategoryChart = ({ data, loading }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = data?.reduce((sum, d) => sum + d.value, 0) || 0;

  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md transition-colors">
        <SkeletonLoader type="chart" />
      </div>
    );
  }

  /* ── Empty state ── */
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700
        flex flex-col items-center justify-center min-h-[420px] text-center transition-colors">
        <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 text-4xl">
          📊
        </div>
        <p className="text-slate-700 dark:text-slate-100 font-semibold text-lg">No Expense Data</p>
        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1 max-w-xs">
          Start adding expenses to see a category breakdown here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Expenses by Category</h3>
          <p className="text-slate-400 text-xs mt-0.5">Total: ₹{total.toLocaleString("en-IN")}</p>
        </div>
        <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
          {data.length} categories
        </span>
      </div>

      {/* Donut chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={110}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              animationBegin={0}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category legend with mini progress bars */}
      <div className="mt-4 space-y-2.5">
        {data.map((item, index) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={index}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-700 font-medium truncate max-w-[130px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-semibold">₹{item.value.toLocaleString("en-IN")}</span>
                  <span className="text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ExpenseByCategoryChart);
