import React, { useState } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { validateEmail } from "../../utils/helper";
import { useAuth } from "../../context/AuthContext";
import InputField from "../../components/Inputs/InputField";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import GoogleAuthButton from "../../components/Auth/GoogleAuthButton";
import { LuUser, LuMail, LuLock, LuLoader, LuShield } from "react-icons/lu";
import { motion as Motion, AnimatePresence } from "framer-motion";

const SignUp = () => {
  const [profilePic, setProfilePic] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (!password) return { level: -1, label: "", color: "bg-slate-200", text: "text-slate-400" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const levels = [
      { level: 0, label: "Very Weak", color: "bg-red-500", text: "text-red-500" },
      { level: 1, label: "Weak", color: "bg-orange-500", text: "text-orange-500" },
      { level: 2, label: "Fair", color: "bg-yellow-500", text: "text-yellow-500" },
      { level: 3, label: "Good", color: "bg-blue-500", text: "text-blue-500" },
      { level: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" },
    ];
    return levels[strength];
  };

  const strength = getPasswordStrength();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!fullName) return setError("Please enter your name");
    if (!validateEmail(email)) return setError("Please enter a valid email address");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!termsAccepted) return setError("Please accept the terms and conditions");

    setError("");
    setLoading(true);

    try {
      await signup({ fullName, email, password });
      navigate("/dashboard");

    } catch (error) {
      console.error(error);
      setError(error.message || "Server error. Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <header className="text-center lg:text-left">
          <Motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4"
          >
            <LuShield size={28} />
          </Motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-light text-sm">
            Join us to start managing your expenses professionally
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            💡 If you sign up with Google, you won't need to create a password.
          </p>
        </header>

        <AnimatePresence mode="wait">
          {error && (
            <Motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-medium overflow-hidden"
            >
              <span>⚠️</span>
              {error}
            </Motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <GoogleAuthButton label="Continue with Google" setError={setError} setLoading={setLoading} loading={loading} />

          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span className="flex-1 h-px bg-slate-200"></span>
            <span>or create an account with email</span>
            <span className="flex-1 h-px bg-slate-200"></span>
          </div>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-2 pb-2">
            <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />
            <span className="text-xs text-slate-400 font-medium">Upload profile picture</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <InputField
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              type="text"
              icon={LuUser}
            />
            <InputField
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              icon={LuMail}
            />
          </div>

          <InputField
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            icon={LuLock}
          />

          {password && (
            <div className="px-1 -mt-2 pb-2">
               <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Security Strength</span>
                  <span className={`text-[10px] font-bold ${strength.text}`}>{strength.label}</span>
               </div>
               <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-full flex-1 transition-all duration-500 rounded-full ${i <= strength.level ? strength.color : 'bg-transparent'}`} 
                    />
                  ))}
               </div>
            </div>
          )}

          <InputField
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            type="password"
            icon={LuLock}
          />

          <div className="flex items-center gap-3 py-1">
             <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={termsAccepted}
                  onChange={() => setTermsAccepted(!termsAccepted)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  I agree to the <Link to="#" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Terms & Conditions</Link>
                </span>
             </label>
          </div>

          <Motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-2xl shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3"
          >
            {loading ? <LuLoader className="animate-spin" size={20} /> : "Create Account"}
          </Motion.button>
          <footer className="pt-4 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </footer>
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignUp;
