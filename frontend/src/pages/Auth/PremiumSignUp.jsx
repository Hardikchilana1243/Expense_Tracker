import React, { useState, useContext, useRef } from "react";
import PremiumAuthLayout from "../../components/layouts/PremiumAuthLayout";
import { useNavigate, Link } from "react-router-dom";
import { validateEmail } from "../../utils/helper";
import { UserContext } from "../../context/UserContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";
import EnhancedInputField from "../../components/Inputs/EnhancedInputField";
import PasswordStrengthIndicator from "../../components/Cards/PasswordStrengthIndicator";
import { LuUser, LuMail, LuLock, LuLoader2, LuShield, LuArrowRight, LuCheck, LuUpload, LuX } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

const PremiumSignUp = () => {
  const [step, setStep] = useState(1);
  const [profilePic, setProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const fileInputRef = useRef(null);

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (!password) return { level: -1 };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return { level: strength };
  };

  const strength = getPasswordStrength();
  const isPasswordStrong = strength.level >= 2;

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
        setProfilePic(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError("Invalid email address");
    } else {
      setEmailError("");
    }
  };

  const handlePasswordConfirmChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value && password !== value) {
      setPasswordMatchError("Passwords do not match");
    } else {
      setPasswordMatchError("");
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!fullName.trim()) {
        setError("Please enter your full name");
        return;
      }
      if (!validateEmail(email)) {
        setError("Please enter a valid email address");
        return;
      }
      setError("");
      setStep(2);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!isPasswordStrong) {
      setError("Password must be strong. Follow the requirements below.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the terms and conditions");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.SIGNUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Signup failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
      if (data.user) updateUser(data.user);
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

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
        staggerChildren: 0.08,
        delayChildren: 0.1,
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
            key={`step-${step}`}
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
                whileHover={{ scale: 1.05, rotate: -5 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg mb-2 hover:shadow-purple-500/50 transition-all"
              >
                <LuShield size={32} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Create Account
                </h1>
              </motion.div>

              <motion.p 
                variants={itemVariants}
                className="text-slate-600 dark:text-slate-400 text-lg font-light max-w-sm"
              >
                Join thousands of users managing their finances smartly
              </motion.p>
            </motion.header>

            {/* Progress Indicator */}
            <motion.div variants={itemVariants} className="flex gap-3">
              {[1, 2].map((num) => (
                <motion.div
                  key={num}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    step >= num 
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600" 
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              ))}
            </motion.div>

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

            {/* Step 1: Name & Email */}
            {step === 1 && (
              <motion.form 
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <EnhancedInputField
                    id="fullname"
                    placeholder="Full Name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    icon={LuUser}
                    required={true}
                    success={fullName.trim().length > 0}
                    disabled={loading}
                  />
                </motion.div>

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

                <motion.div variants={itemVariants}>
                  <motion.button
                    type="button"
                    onClick={handleNext}
                    disabled={!fullName.trim() || !email || emailError || loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3
                      ${
                        !fullName.trim() || !email || emailError || loading
                          ? "bg-gradient-to-r from-slate-400 to-slate-500"
                          : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      }
                    `}
                  >
                    <span>Continue</span>
                    <LuArrowRight size={22} />
                  </motion.button>
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700"></div>
                  <span className="text-sm text-slate-500 dark:text-slate-500 font-medium">or</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent dark:from-slate-700"></div>
                </motion.div>

                <motion.div variants={itemVariants} className="text-center">
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200 hover:underline"
                    >
                      Sign In
                    </Link>
                  </p>
                </motion.div>
              </motion.form>
            )}

            {/* Step 2: Password & Security */}
            {step === 2 && (
              <motion.form 
                onSubmit={handleSignUp}
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Profile Photo Upload */}
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Profile Picture (Optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    className="hidden"
                  />
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-8 text-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all duration-300 group"
                  >
                    {profilePreview ? (
                      <div className="relative flex flex-col items-center gap-4">
                        <motion.img
                          src={profilePreview}
                          alt="Profile"
                          className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        />
                        <div className="text-center">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">Picture selected</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Click to change</p>
                        </div>
                        <motion.button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfilePreview(null);
                            setProfilePic(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <LuX size={16} />
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-4xl"
                        >
                          📸
                        </motion.div>
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">Upload profile photo</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
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
                  <PasswordStrengthIndicator password={password} />
                </motion.div>

                {/* Confirm Password Field */}
                <motion.div variants={itemVariants}>
                  <EnhancedInputField
                    id="confirmpassword"
                    placeholder="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={handlePasswordConfirmChange}
                    icon={LuLock}
                    required={true}
                    error={passwordMatchError}
                    success={confirmPassword && !passwordMatchError && password === confirmPassword}
                    disabled={loading}
                  />
                </motion.div>

                {/* Terms & Conditions */}
                <motion.div variants={itemVariants}>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-5 h-5 rounded-lg bg-indigo-100 border-2 border-indigo-300 text-indigo-600 cursor-pointer accent-indigo-600 dark:bg-slate-700 dark:border-slate-600 dark:accent-indigo-500 transition-all hover:border-indigo-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-medium">
                      I agree to the{" "}
                      <a href="#" className="underline font-bold hover:text-indigo-700 dark:hover:text-indigo-300">
                        Terms of Service
                      </a>
                      {" "}and{" "}
                      <a href="#" className="underline font-bold hover:text-indigo-700 dark:hover:text-indigo-300">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                </motion.div>

                {/* Sign Up Button */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="submit"
                    disabled={loading || !termsAccepted || !isPasswordStrong || password !== confirmPassword}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3
                      ${
                        loading || !termsAccepted || !isPasswordStrong || password !== confirmPassword
                          ? "bg-gradient-to-r from-slate-400 to-slate-500"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <LuArrowRight size={22} />
                      </>
                    )}
                  </motion.button>
                </motion.div>

                {/* Back Button */}
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all border-2 border-indigo-200 dark:border-indigo-800 disabled:opacity-60"
                  >
                    ← Back
                  </motion.button>
                </motion.div>
              </motion.form>
            )}

            {/* Security Notice */}
            <motion.div
              variants={itemVariants}
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm font-medium"
            >
              <span className="text-lg">✅</span>
              <span>Your data is encrypted with bank-level security. We protect your privacy.</span>
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
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Created!</h2>
              <p className="text-slate-600 dark:text-slate-400">Welcome! Setting up your dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PremiumAuthLayout>
  );
};

export default PremiumSignUp;
