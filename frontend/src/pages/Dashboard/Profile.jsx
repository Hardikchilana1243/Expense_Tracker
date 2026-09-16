import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";
import apiClient from "../../utils/apiClient";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import BankLink from "../../components/BankLink";
import StatementUploader from "../../components/StatementUploader";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bankAccount, setBankAccount] = useState(null);

  // Notification Preferences State
  const [prefLoading, setPrefLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    monthlyEmail: true,
    dayOfMonth: 1,
  });

  // Report History State
  const [reportHistory, setReportHistory] = useState([]);

  // Fetch Bank Account
  const fetchBankAccount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(API_ENDPOINTS.MOCK.GET(user.id), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBankAccount(data?.bankAccount || null);
      }
    } catch (err) {
      console.error("Fetch bank account error:", err);
      setBankAccount(null);
    }
  }, [user?.id]);

  // Fetch Notification Preferences & Report History
  const fetchPreferencesAndHistory = useCallback(async () => {
    setPrefLoading(true);
    try {
      const prefData = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES);
      if (prefData?.success) {
        const settings = prefData.data.notificationSettings || {};
        const report = settings.monthlyReport || {};

        setPreferences({
          emailEnabled: settings.email?.enabled ?? true,
          monthlyEmail: report.email ?? true,
          dayOfMonth: report.dayOfMonth ?? 1,
        });
      }

      const historyData = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.REPORT_HISTORY);
      if (historyData?.success) {
        setReportHistory(Array.isArray(historyData.data) ? historyData.data : []);
      }
    } catch (err) {
      console.error("fetchPreferencesAndHistory error:", err);
    } finally {
      setPrefLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBankAccount();
    fetchPreferencesAndHistory();
  }, [fetchBankAccount, fetchPreferencesAndHistory]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Save Preferences
  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const data = await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES, preferences);
      toast.success(data?.message || "✓ Preferences saved successfully");
      await fetchPreferencesAndHistory();
    } catch (err) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  // Trigger Manual Monthly Report Test Dispatch
  const handleTriggerMonthlyReports = async () => {
    setReportLoading(true);
    try {
      toast.loading("Preparing report & sending email...", { id: "report_trigger" });
      const res = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.TRIGGER_REPORTS, {});
      
      const channels = res?.channels || res?.results?.channels || {};
      const email = channels.email || {};

      if (email.status === "sent") {
        toast.success(`📧 Email: ✅ Sent successfully to ${user?.email}`, { id: "report_trigger", duration: 6000 });
      } else if (email.message) {
        toast.error(`📧 Email: ${email.message}`, { id: "report_trigger", duration: 7000 });
      } else {
        toast.success("Test report dispatch completed", { id: "report_trigger" });
      }

      await fetchPreferencesAndHistory();
    } catch (err) {
      toast.error(err.message || "Failed to trigger test dispatch report", { id: "report_trigger" });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Profile">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 md:p-8 min-h-screen space-y-8 bg-slate-50/50 dark:bg-slate-950 transition-colors"
      >
        {/* Profile Header Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 flex items-center gap-3">
              <span>👤</span> My Profile
            </h1>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-2xl font-bold">{user?.fullName || "User"}</p>
                <p className="text-indigo-200 text-sm mt-1">{user?.email}</p>
              </div>
              {bankAccount && (
                <div className="bg-white/15 backdrop-blur-md p-5 rounded-2xl border border-white/20">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-100 mb-1">
                    💳 Linked Bank
                  </h3>
                  <p className="text-lg font-extrabold">
                    ****{bankAccount.accountNumber ? bankAccount.accountNumber.slice(-4) : "XXXX"}
                  </p>
                  <p className="text-xs text-indigo-200">{bankAccount.bankName || "N/A"}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bank Connection Section */}
        <div className="max-w-4xl mx-auto space-y-6">
          {!(bankAccount && bankAccount.accountNumber) ? (
            <BankLink
              userId={user?.id}
              onSuccess={(acc) => {
                setBankAccount(acc);
                toast.success("Bank linked! Import transactions from Dashboard");
              }}
            />
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-200">
                    Bank Account Active
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    ****{bankAccount.accountNumber ? bankAccount.accountNumber.slice(-4) : "XXXX"} ({bankAccount.bankName})
                  </p>
                </div>
              </div>
            </div>
          )}

          {bankAccount && bankAccount.accountNumber && (
            <StatementUploader
              userId={user?.id}
              onImportComplete={() => {
                fetchBankAccount();
                toast.success("Statement import completed");
              }}
            />
          )}
        </div>

        {/* Communication Preferences & Monthly Reports */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 md:p-8 space-y-6 transition-colors">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔔</span> Communication Preferences
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure monthly email reports and report schedule
              </p>
            </div>

            {prefLoading ? (
              <div className="p-8 text-center text-slate-400">Loading preferences...</div>
            ) : (
              <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800/80">
                {/* 1. Email Preferences */}
                <div className="pt-4 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>📧</span> Email Settings
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.email}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.monthlyEmail}
                      onChange={(e) =>
                        setPreferences({ ...preferences, monthlyEmail: e.target.checked })
                      }
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Monthly Email Report
                    </span>
                  </label>
                </div>

                {/* 2. Schedule & Actions */}
                <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Report schedule:
                    </label>
                    <select
                      value={preferences.dayOfMonth}
                      onChange={(e) =>
                        setPreferences({ ...preferences, dayOfMonth: parseInt(e.target.value) || 1 })
                      }
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                    >
                      <option value={1}>1st of every month</option>
                      <option value={5}>5th of every month</option>
                      <option value={10}>10th of every month</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={reportLoading}
                      onClick={handleTriggerMonthlyReports}
                      className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {reportLoading ? "Sending..." : "Test Dispatch Report"}
                    </button>
                    <button
                      onClick={handleSavePreferences}
                      disabled={savingPrefs}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingPrefs ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report Delivery History */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 overflow-hidden transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📋</span> Report Delivery History
            </h3>

            {reportHistory.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                No delivery logs available yet. Scheduled reports will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Month</th>
                      <th className="px-4 py-3 text-left">Channel</th>
                      <th className="px-4 py-3 text-left">Recipient</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                          {item.month}/{item.year}
                        </td>
                        <td className="px-4 py-3 font-semibold uppercase text-slate-600 dark:text-slate-300">
                          📧 Email
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">
                          {item.recipient}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.status === "sent" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                              ✓ Sent
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              ✗ Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {new Date(item.sentAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Account Logout Settings */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">⚙️ Account Session</h3>
            <button
              onClick={handleLogout}
              className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 py-3 px-6 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Logout Account
            </button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
