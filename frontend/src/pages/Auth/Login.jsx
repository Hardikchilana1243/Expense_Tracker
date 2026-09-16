import React, { useState } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { validateEmail } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";
import InputField from "../../components/Inputs/InputField";
import GoogleAuthButton from "../../components/Auth/GoogleAuthButton";
import { LuMail, LuLock, LuLoader } from "react-icons/lu";
import { motion as Motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // 🔴 validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate("/dashboard");

    } catch (err) {
      console.error("❌ Login Error:", err);
      if (err.status === 429 || err.code === "RATE_LIMITED") {
        const seconds = err.retryAfter || 30;
        setError(`Too many login attempts. Please wait ${seconds} seconds and try again.`);
      } else {
        setError(err.message || "Server error. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <header className="text-center lg:text-left">
          <Motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6 shadow-sm"
          >
            <LuLock size={32} />
          </Motion.div>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome Back
          </h1>

          <p className="text-slate-500 dark:text-slate-400 mt-2 font-light">
            Sign in to continue tracking your expenses
          </p>
        </header>

        {/* ERROR */}
        {error && (
          <Motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium"
          >
            <span>⚠️</span>
            {error}
          </Motion.div>
        )}

        {/* GOOGLE LOGIN */}
        <div className="space-y-4">
          <GoogleAuthButton
            label="Continue with Google"
            setError={setError}
            setLoading={setLoading}
            loading={loading}
          />

          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span className="flex-1 h-px bg-slate-200"></span>
            <span>or continue with email</span>
            <span className="flex-1 h-px bg-slate-200"></span>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-3">

          <InputField
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            type="email"
            icon={LuMail}
          />

          <InputField
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            icon={LuLock}
          />

          <div className="flex items-center justify-between pb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Remember me
              </span>
            </label>

            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              Forgot Password?
            </Link>
          </div>

          {/* BUTTON */}
          <Motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-2xl shadow-lg disabled:opacity-70 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <LuLoader className="animate-spin" size={20} />
                Logging in...
              </>
            ) : (
              "Sign In"
            )}
          </Motion.button>

          <footer className="pt-6 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Sign up for free
              </Link>
            </p>
          </footer>

        </form>
      </div>
    </AuthLayout>
  );
};

export default Login;