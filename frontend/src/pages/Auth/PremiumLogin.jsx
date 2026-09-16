import React, { useState, useContext } from "react";
import PremiumAuthLayout from "../../components/layouts/PremiumAuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { validateEmail } from "../../utils/helper";
import { UserContext } from "../../context/UserContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";
import EnhancedInputField from "../../components/Inputs/EnhancedInputField";
import { LuMail, LuLock, LuLoader2, LuArrowRight, LuCheck } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

const PremiumLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [success, setSuccess] = useState(false);

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError("Invalid email address");
    } else {
      setEmailError("");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
      if (data.user) {
        updateUser(data.user);
      }
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 600);

    } catch (error) {
      console.error(error);
      setError("Server error. Please try again");
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <PremiumAuthLayout>
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Header Section */}
            <motion.header 
              className="text-center lg:text-left space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg mb-2 hover:shadow-indigo-500/50 transition-all"
              >
                <LuLock size={32} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Welcome Back
                </h1>
              </motion.div>

              <motion.p 
                variants={itemVariants}
                className="text-slate-600 dark:text-slate-400 text-lg font-light max-w-sm"
              >
                Sign in to your account and manage your expenses effortlessly
              </motion.p>
            </motion.header>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-semibold shadow-lg"
                >
                  <span className="text-xl">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <motion.form 
              onSubmit={handleLogin} 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Email Field */}
              <motion.div variants={itemVariants}>
                <EnhancedInputField
                  id="email"
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  icon={LuMail}
                  required={true}
                  error={emailError}
                  success={email && !emailError && validateEmail(email)}
                  disabled={loading}
                />
              </motion.div>

              {/* Password Field */}
              <motion.div variants={itemVariants}>
                <EnhancedInputField
                  id="password"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={LuLock}
                  required={true}
                  disabled={loading}
                />
              </motion.div>

              {/* Remember & Forgot Password */}
              <motion.div 
                variants={itemVariants}
                className="flex items-center justify-between text-sm"
              >
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-indigo-100 border-2 border-indigo-300 text-indigo-600 cursor-pointer accent-indigo-600 dark:bg-slate-700 dark:border-slate-600 dark:accent-indigo-500 transition-all hover:border-indigo-500"
                    disabled={loading}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200 hover:underline"
                >
                  Forgot password?
                </Link>
              </motion.div>

              {/* Login Button */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={loading || !email || !password}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3
                    ${
                      loading || !email || !password
                        ? "bg-gradient-to-r from-slate-400 to-slate-500"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:from-indigo-800 active:to-purple-800"
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <LuLoader2 size={22} />
                      </motion.div>
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <LuArrowRight size={22} />
                    </>
                  )}
                </motion.button>
              </motion.div>

              {/* Divider */}
              <motion.div variants={itemVariants} className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700"></div>
                <span className="text-sm text-slate-500 dark:text-slate-500 font-medium">New here?</span>
                <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent dark:from-slate-700"></div>
              </motion.div>

              {/* Sign Up Link */}
              <motion.div variants={itemVariants} className="text-center">
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200 hover:underline"
                  >
                    Create one now
                  </Link>
                </p>
              </motion.div>
            </motion.form>

            {/* Security Notice */}
            <motion.div
              variants={itemVariants}
              className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-3 text-indigo-700 dark:text-indigo-300 text-sm font-medium"
            >
              <span className="text-lg">🔒</span>
              <span>Your data is encrypted and secure. We never store passwords in plain text.</span>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center gap-6 py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white shadow-lg"
            >
              <LuCheck size={48} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Login Successful!</h2>
              <p className="text-slate-600 dark:text-slate-400">Redirecting to your dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PremiumAuthLayout>
  );
};

export default PremiumLogin;
