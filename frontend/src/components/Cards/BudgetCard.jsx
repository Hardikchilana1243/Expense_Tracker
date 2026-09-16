import React from "react";
import { LuTrash2, LuPencil } from "react-icons/lu";

const BudgetCard = ({ budget, onEdit, onDelete }) => {
  const { category, limit, spent, remaining, percentage, alertLevel } = budget;

  // Determine colors based on alert level
  let barColor = "bg-emerald-500";
  let bgGlow = "hover:shadow-emerald-500/20";
  let textColor = "text-emerald-600";
  let badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-200";

  if (alertLevel === "warning") {
    barColor = "bg-amber-500";
    bgGlow = "hover:shadow-amber-500/20";
    textColor = "text-amber-600";
    badgeColor = "bg-amber-50 text-amber-600 border-amber-200";
  } else if (alertLevel === "exceeded") {
    barColor = "bg-rose-500";
    bgGlow = "hover:shadow-rose-500/20";
    textColor = "text-rose-600";
    badgeColor = "bg-rose-50 text-rose-600 border-rose-200";
  }

  // Format currency
  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className={`bg-white dark:bg-slate-950 dark:border-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-lg ${bgGlow} relative overflow-hidden group`}>
      {/* Decorative top bar */}
      <div className={`absolute top-0 left-0 w-full h-1 ${barColor} opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{category}</h3>
          <p className="text-slate-400 dark:text-slate-400 text-xs mt-0.5">Monthly Limit: {fmt(limit)}</p>
        </div>
        
        {/* Actions (Edit/Delete) */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={() => onEdit(budget)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            title="Edit Budget"
          >
            <LuPencil size={16} />
          </button>
          <button 
            onClick={() => onDelete(budget._id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Delete Budget"
          >
            <LuTrash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Amounts */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Spent</p>
            <p className="text-xl font-extrabold text-slate-800">{fmt(spent)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
            <p className={`text-xl font-extrabold ${textColor}`}>
              {alertLevel === "exceeded" ? "Over by " : ""}{fmt(Math.abs(remaining))}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative pt-2">
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className={`h-full ${barColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
              {percentage}% Used
            </span>
            
            {alertLevel === "warning" && (
              <span className="text-xs font-medium text-amber-500 flex items-center gap-1">
                <span className="animate-pulse">⚠️</span> Nearing limit
              </span>
            )}
            {alertLevel === "exceeded" && (
              <span className="text-xs font-medium text-rose-500 flex items-center gap-1">
                <span className="animate-bounce">🚨</span> Budget exceeded
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetCard;
