import React, { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { motion } from "framer-motion";

const EnhancedInputField = ({ 
  value, 
  onChange, 
  placeholder, 
  type, 
  icon: Icon, 
  id, 
  required = true,
  error = null,
  success = false,
  disabled = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const toggleShowPassword = () => setShowPassword(!showPassword);

  const inputType = type === "password" ? (showPassword ? "text" : "password") : type;
  const isFilled = value && value.length > 0;
  const hasError = error && error.length > 0;

  return (
    <div className="relative mb-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex items-center border-2 rounded-2xl px-5 py-4 transition-all duration-300 backdrop-blur-xl
          ${
            hasError 
              ? "border-red-300 dark:border-red-500/50 bg-red-50/30 dark:bg-red-900/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              : isFocused 
              ? "border-indigo-500 bg-white/60 dark:bg-slate-800/60 shadow-[0_0_20px_rgba(99,102,241,0.3)] dark:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              : success
              ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10"
              : "border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {Icon && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: isFocused ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            className={`text-lg mr-3 flex-shrink-0 transition-colors duration-300 ${
              hasError
                ? "text-red-500"
                : success
                ? "text-emerald-500"
                : isFocused 
                ? "text-indigo-600 dark:text-indigo-400" 
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <Icon />
          </motion.div>
        )}
        
        <div className="relative flex-1 flex flex-col justify-center h-6">
          <motion.label
            htmlFor={id}
            initial={false}
            animate={{
              y: isFocused || isFilled ? -26 : 0,
              scale: isFocused || isFilled ? 0.8 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute left-0 pointer-events-none transform origin-left whitespace-nowrap font-medium transition-colors duration-300 ${
              isFocused || isFilled 
                ? hasError
                  ? "text-red-600 dark:text-red-400 bg-white dark:bg-slate-900 px-1.5 -ml-1.5 rounded-lg shadow-sm"
                  : success
                  ? "text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-1.5 -ml-1.5 rounded-lg shadow-sm"
                  : "text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-1.5 -ml-1.5 rounded-lg shadow-sm"
                : hasError
                ? "text-red-500 dark:text-red-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {placeholder}
          </motion.label>
          
          <input
            id={id}
            type={inputType}
            className="w-full h-full bg-transparent outline-none text-slate-800 dark:text-slate-100 z-10 relative disabled:cursor-not-allowed"
            value={value}
            onChange={onChange}
            onFocus={() => !disabled && setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            required={required}
            disabled={disabled}
          />
        </div>

        {type === "password" && (
          <motion.button
            type="button"
            onClick={toggleShowPassword}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="ml-3 text-slate-400 hover:text-indigo-500 focus:outline-none transition-colors duration-300 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            {showPassword ? <FaRegEye size={20} /> : <FaRegEyeSlash size={20} />}
          </motion.button>
        )}

        {success && !hasError && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="ml-3 text-emerald-500 text-lg"
          >
            ✓
          </motion.div>
        )}
      </motion.div>

      {hasError && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm font-medium text-red-500 dark:text-red-400 flex items-center gap-1"
        >
          <span>⚠️</span> {error}
        </motion.p>
      )}
    </div>
  );
};

export default EnhancedInputField;
