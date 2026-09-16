import React, { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { motion } from "framer-motion";

const InputField = ({ value, onChange, placeholder, type, icon: Icon, id, required = true }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const toggleShowPassword = () => setShowPassword(!showPassword);

  const inputType = type === "password" ? (showPassword ? "text" : "password") : type;
  const isFilled = value && value.length > 0;

  return (
    <div className="relative mb-6">
      <div 
        className={`flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-300 bg-white/50 backdrop-blur-sm dark:bg-slate-800/50 ${
          isFocused ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        {Icon && (
          <Icon 
            className={`text-xl transition-colors duration-300 ${
              isFocused ? "text-indigo-500" : "text-slate-400 dark:text-slate-500"
            } mr-3`} 
          />
        )}
        
        <div className="relative flex-1 flex flex-col justify-center h-6">
          <motion.label
            htmlFor={id}
            initial={false}
            animate={{
              y: isFocused || isFilled ? -26 : 0,
              scale: isFocused || isFilled ? 0.85 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute left-0 pointer-events-none transform origin-left whitespace-nowrap ${
              isFocused || isFilled 
                ? "text-indigo-600 dark:text-indigo-400 font-medium bg-white dark:bg-slate-900 px-1 -ml-1 rounded shadow-sm" 
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {placeholder}
          </motion.label>
          
          <input
            id={id}
            type={inputType}
            className="w-full h-full bg-transparent outline-none text-slate-800 dark:text-slate-100 z-10 relative"
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            required={required}
          />
        </div>

        {type === "password" && (
          <button
            type="button"
            onClick={toggleShowPassword}
            className="ml-3 text-slate-400 hover:text-indigo-500 focus:outline-none transition-colors duration-300"
          >
            {showPassword ? <FaRegEye size={20} /> : <FaRegEyeSlash size={20} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default InputField;
