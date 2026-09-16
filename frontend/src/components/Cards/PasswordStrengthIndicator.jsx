import React from "react";
import { motion } from "framer-motion";
import { LuCheck, LuX } from "react-icons/lu";

const PasswordStrengthIndicator = ({ password }) => {
  const getPasswordStrength = () => {
    if (!password) return { level: -1, label: "", color: "bg-slate-200", text: "text-slate-400" };
    
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    Object.values(checks).forEach(check => {
      if (check) strength++;
    });

    const levels = [
      { level: 0, label: "Very Weak", color: "bg-red-500", text: "text-red-600 dark:text-red-400", lightBg: "bg-red-50 dark:bg-red-900/20" },
      { level: 1, label: "Weak", color: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", lightBg: "bg-orange-50 dark:bg-orange-900/20" },
      { level: 2, label: "Fair", color: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", lightBg: "bg-yellow-50 dark:bg-yellow-900/20" },
      { level: 3, label: "Good", color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", lightBg: "bg-blue-50 dark:bg-blue-900/20" },
      { level: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", lightBg: "bg-emerald-50 dark:bg-emerald-900/20" },
    ];

    return { ...levels[strength], strength, checks };
  };

  const strength = getPasswordStrength();

  if (strength.level === -1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mt-4 p-4 rounded-2xl border border-current border-opacity-20 ${strength.lightBg}`}
    >
      {/* Strength Bars */}
      <div className="flex gap-2 mb-3">
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: index < strength.level + 1 ? 1 : 0.3 }}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              index < strength.level + 1 ? strength.color : "bg-slate-200 dark:bg-slate-700"
            }`}
            style={{ originY: "bottom" }}
          />
        ))}
      </div>

      {/* Strength Label */}
      <p className={`text-sm font-semibold mb-3 ${strength.text}`}>
        Password Strength: {strength.label}
      </p>

      {/* Requirement Checklist */}
      <div className="space-y-2">
        <RequirementItem
          label="At least 8 characters"
          met={strength.checks.length}
        />
        <RequirementItem
          label="Contains uppercase letter"
          met={strength.checks.uppercase}
        />
        <RequirementItem
          label="Contains number"
          met={strength.checks.number}
        />
        <RequirementItem
          label="Contains special character"
          met={strength.checks.special}
        />
      </div>
    </motion.div>
  );
};

const RequirementItem = ({ label, met }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-2 text-xs"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`flex items-center justify-center w-4 h-4 rounded-full ${
        met 
          ? "bg-emerald-500 text-white" 
          : "bg-slate-200 dark:bg-slate-700 text-slate-400"
      }`}
    >
      {met ? <LuCheck size={14} /> : <LuX size={14} />}
    </motion.div>
    <span className={met ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"}>
      {label}
    </span>
  </motion.div>
);

export default PasswordStrengthIndicator;
