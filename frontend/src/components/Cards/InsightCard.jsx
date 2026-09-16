import React from "react";

const InsightCard = ({ insight }) => {
  const { type, icon, title, message } = insight;

  let colorClasses = "";
  
  switch (type) {
    case "danger":
      colorClasses = "bg-rose-50 border-rose-200 text-rose-700 icon-bg-rose-100 icon-text-rose-600";
      break;
    case "warning":
      colorClasses = "bg-amber-50 border-amber-200 text-amber-700 icon-bg-amber-100 icon-text-amber-600";
      break;
    case "suggestion":
      colorClasses = "bg-emerald-50 border-emerald-200 text-emerald-700 icon-bg-emerald-100 icon-text-emerald-600";
      break;
    case "info":
    default:
      colorClasses = "bg-blue-50 border-blue-200 text-blue-700 icon-bg-blue-100 icon-text-blue-600";
      break;
  }

  // Extract individual classes for better targeting
  const [, bg, border, text, iconBg, iconText] = colorClasses.match(/(bg-\S+) (border-\S+) (text-\S+) icon-(bg-\S+) icon-(text-\S+)/);

  return (
    <div className={`p-4 rounded-2xl border ${bg} ${border} flex items-start gap-4 transition-transform hover:-translate-y-1 hover:shadow-md`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${iconBg} ${iconText}`}>
        {icon}
      </div>
      <div>
        <h4 className={`font-bold text-sm mb-1 ${text}`}>{title}</h4>
        <p className={`text-xs opacity-90 leading-relaxed ${text}`}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default React.memo(InsightCard);
