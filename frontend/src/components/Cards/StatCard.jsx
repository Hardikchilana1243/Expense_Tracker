import React from "react";

/**
 * StatCard - Premium financial metric card
 * Props:
 *   icon        - emoji or JSX icon
 *   label       - card title
 *   value       - formatted value string
 *   bgGradient  - Tailwind gradient class
 *   trend       - trend label string
 *   trendUp     - boolean (green if true, red if false)
 *   progress    - 0-100 number for the progress bar (optional)
 *   subValue    - small secondary info (optional)
 */
const StatCard = ({ icon, label, value, bgGradient, trend, trendUp, progress, subValue }) => {
  return (
    <div
      className={`${bgGradient} text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl
        transform hover:-translate-y-1 transition-all duration-300 ease-out relative overflow-hidden`}
    >
      {/* Decorative background circles */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white opacity-10 pointer-events-none" />
      <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white opacity-5 pointer-events-none" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
            {label}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight">{value}</h2>
          {subValue && (
            <p className="text-white/60 text-xs mt-1">{subValue}</p>
          )}
        </div>

        {/* Icon bubble */}
        <div className="bg-white/20 backdrop-blur-sm text-2xl w-14 h-14 rounded-2xl
          flex items-center justify-center shadow-inner border border-white/20">
          {icon}
        </div>
      </div>

      {/* Progress bar */}
      {typeof progress === "number" && (
        <div className="relative z-10 mb-3">
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/70 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Trend badge */}
      {trend && (
        <div className={`relative z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
          ${trendUp ? "bg-green-400/25 text-green-100" : "bg-red-400/25 text-red-100"}`}>
          {trendUp ? "▲" : "▼"} {trend}
        </div>
      )}
    </div>
  );
};

export default React.memo(StatCard);
