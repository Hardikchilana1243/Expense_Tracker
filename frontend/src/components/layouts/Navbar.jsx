import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { LuMoon, LuSun, LuBell } from "react-icons/lu";
import SideMenu from "./SideMenu";
import { useAuth } from "../../context/AuthContext";
import { ThemeContext } from "../../context/ThemeContext";
import { API_ENDPOINTS } from "../../utils/apiPaths";

const Navbar = ({ activeMenu }) => {
  const [openSideBar, setOpenSideBar] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(API_ENDPOINTS.NOTIFICATIONS.GET_ALL(user.id), {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data);
          setUnreadCount(data.data.filter(n => !n.read).length);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(API_ENDPOINTS.NOTIFICATIONS.READ_ALL(user.id), {
        method: "PUT",
        credentials: "include"
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleMarkOneRead = async (notificationId) => {
    if (!user?.id) return;
    try {
      const res = await fetch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(user.id, notificationId), {
        method: "PUT",
        credentials: "include"
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <div className="flex justify-between items-center bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 py-4 px-7 sticky top-0 z-30 transition-colors">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          className="block lg:hidden text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-colors"
          onClick={() => setOpenSideBar(!openSideBar)}
        >
          {openSideBar ? (
            <HiOutlineX className="text-2xl" />
          ) : (
            <HiOutlineMenu className="text-2xl" />
          )}
        </button>

        <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Expense Tracker
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300"
          title="Toggle Dark Mode"
        >
          {theme === "dark" ? <LuSun className="text-xl" /> : <LuMoon className="text-xl" />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 relative"
          >
            <LuBell className="text-xl" />
            {/* Notification Badge */}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown (Dynamic) */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-slide-in-down">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div 
                      key={item._id}
                      onClick={() => !item.read && handleMarkOneRead(item._id)}
                      className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors ${
                        !item.read ? "bg-indigo-50/40 dark:bg-indigo-950/10 font-medium" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-0.5">
                        <p className={`text-xs ${
                          item.type === "budget_warning" || item.type === "expense_anomaly"
                            ? "text-rose-500" 
                            : item.type === "income" 
                            ? "text-emerald-500" 
                            : "text-indigo-500"
                        } font-bold`}>
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full mt-1 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">
                        {item.message}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        {user && (
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            title="Open profile"
          >
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
          </button>
        )}
      </div>

      {openSideBar && (
        <div className="fixed top-[61px] left-0 bg-white dark:bg-slate-950 transition-colors">
          <SideMenu activeMenu={activeMenu} />
        </div>
      )}
    </div>
  );
};

export default Navbar;
