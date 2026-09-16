import React from "react";
import { useNavigate } from "react-router-dom";

const BudgetAlertsWidget = ({ alerts, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 dark:border-slate-800 rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse transition-colors">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null; // Don't show the widget if there are no alerts
  }

  const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <span className="text-lg">🔔</span> Budget Alerts
        </h3>
        <button 
          onClick={() => navigate("/budgets")}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-slate-800 px-2.5 py-1 rounded-md transition-colors"
        >
          Manage
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, idx) => {
          const isExceeded = alert.alertLevel === "exceeded";
          const bgColor = isExceeded ? "bg-rose-50" : "bg-amber-50";
          const borderColor = isExceeded ? "border-rose-200" : "border-amber-200";
          const textColor = isExceeded ? "text-rose-700" : "text-amber-700";
          const icon = isExceeded ? "🚨" : "⚠️";

          return (
            <div 
              key={idx} 
              className={`p-3 rounded-xl border ${bgColor} ${borderColor} flex items-start gap-3 transition-transform hover:-translate-y-0.5`}
            >
              <div className="text-xl mt-0.5">{icon}</div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${textColor}`}>
                  {alert.category} Budget {isExceeded ? "Exceeded!" : "Warning"}
                </p>
                <p className={`text-xs mt-0.5 ${isExceeded ? "text-rose-600" : "text-amber-600"}`}>
                  {isExceeded 
                    ? `You exceeded the limit by ${fmt(alert.over)}.` 
                    : `You've used ${alert.pct}% of your ${fmt(alert.limit)} budget.`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(BudgetAlertsWidget);
