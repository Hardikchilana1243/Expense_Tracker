import React from "react";

/**
 * SkeletonLoader - Reusable animated shimmer placeholder
 * Usage:
 *   <SkeletonLoader type="card" />         → stat card skeleton
 *   <SkeletonLoader type="chart" />        → chart panel skeleton
 *   <SkeletonLoader type="table-row" count={5} /> → table rows
 *   <SkeletonLoader type="quick-stat" />   → small quick-stat card
 */
const SkeletonLoader = ({ type = "card", count = 1 }) => {
  const Shimmer = ({ className }) => (
    <div className={`skeleton-shimmer rounded-lg ${className}`} />
  );

  if (type === "card") {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-8 w-36" />
            <Shimmer className="h-3 w-20" />
          </div>
          <Shimmer className="h-14 w-14 rounded-2xl" />
        </div>
        <Shimmer className="h-1.5 w-full mt-3" />
      </div>
    );
  }

  if (type === "quick-stat") {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-4 rounded-xl shadow transition-colors">
        <Shimmer className="h-3 w-28 mb-3" />
        <Shimmer className="h-7 w-24 mb-2" />
        <Shimmer className="h-3 w-16" />
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 p-6 rounded-2xl shadow-md transition-colors">
        <div className="mb-4 space-y-2">
          <Shimmer className="h-5 w-48" />
          <Shimmer className="h-3 w-64" />
        </div>
        {/* Fake chart bars / area */}
        <div className="flex items-end gap-3 h-64 px-2">
          {[60, 90, 45, 75, 55, 85, 40, 70, 65, 80].map((h, i) => (
            <div
              key={i}
              className="skeleton-shimmer flex-1 rounded-t-md"
              style={{ height: `${h}%`, animationDelay: `${i * 0.07}s` }}
            />
          ))}
        </div>
        <div className="flex gap-4 mt-4">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (type === "table-row") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="py-3 px-4"><Shimmer className="h-6 w-20" /></td>
            <td className="py-3 px-4"><Shimmer className="h-4 w-40" /></td>
            <td className="py-3 px-4"><Shimmer className="h-4 w-24" /></td>
            <td className="py-3 px-4 text-right"><Shimmer className="h-4 w-16 ml-auto" /></td>
            <td className="py-3 px-4"><Shimmer className="h-4 w-20" /></td>
          </tr>
        ))}
      </>
    );
  }

  // Default: generic line skeleton
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className="h-4 w-full" />
      ))}
    </div>
  );
};

export default SkeletonLoader;
