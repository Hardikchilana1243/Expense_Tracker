import React from "react";
import { motion as Motion } from "framer-motion";
import { LuLayoutDashboard, LuHandCoins, LuTarget } from "react-icons/lu";

const AuthLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300 font-sans overflow-hidden">

      {/* LEFT SIDE */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-10 md:px-14 lg:px-20 relative z-20 overflow-y-auto py-8">
        
        <Motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md mx-auto lg:mx-0"
        >
          {children}
        </Motion.div>

      </div>

      {/* RIGHT SIDE */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 dark:from-indigo-950 dark:via-violet-900 dark:to-purple-950">

        {/* overlay */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-0"></div>

        {/* floating blobs */}
        <Motion.div
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -40, 30, 0],
            rotate: [0, 30, -15, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-pink-400/20 to-rose-400/10 blur-[120px]"
        />

        <Motion.div
          animate={{
            x: [0, -40, 30, 0],
            y: [0, 40, -40, 0],
            rotate: [0, -20, 20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-20%] right-[-15%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-cyan-400/15 to-blue-400/10 blur-[150px]"
        />

        {/* CONTENT */}
        <div className="relative z-10 flex flex-col justify-center h-full px-12 text-white w-full">

          <Motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >

            <h2 className="text-5xl xl:text-6xl font-bold mb-4 leading-tight">
              Master Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-blue-200 to-indigo-200">
                Money Today
              </span>
            </h2>

            <p className="text-lg text-indigo-100/90 mb-10 max-w-lg">
              Track expenses, manage budgets, and gain powerful insights into your finances.
            </p>

            {/* FEATURES */}
            <div className="space-y-4">

              <FeatureCard
                icon={<LuLayoutDashboard size={22} />}
                title="Smart Insights"
                desc="AI-powered analytics reveal patterns."
                delay={0.3}
              />

              <FeatureCard
                icon={<LuHandCoins size={22} />}
                title="Track Everything"
                desc="Manage income & expenses easily."
                delay={0.4}
              />

              <FeatureCard
                icon={<LuTarget size={22} />}
                title="Secure & Reliable"
                desc="Your data is always protected."
                delay={0.5}
              />

            </div>

          </Motion.div>

          {/* floating icon */}
          <Motion.div
            animate={{ y: [-15, 15, -15] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-16 right-16"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-xl rotate-12">
              <span className="text-4xl">💎</span>
            </div>
          </Motion.div>

        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, delay }) => {
  return (
    <Motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all"
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/30 to-blue-400/30">
        {icon}
      </div>

      <div>
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="text-sm text-indigo-100/70">{desc}</p>
      </div>
    </Motion.div>
  );
};

export default AuthLayout;