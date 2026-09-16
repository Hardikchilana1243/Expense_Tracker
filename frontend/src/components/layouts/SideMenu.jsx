import React from "react";
import { SIDE_MENU_DATA } from "../../utils/data";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const SideMenu = ({ activeMenu }) => {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const handleClick = (route) => {
    if (route === "logout") {
      handleLogout();
      return;
    }
    navigate(route);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="w-64 h-[calc(100vh-61px)] bg-white dark:bg-slate-950 dark:border-slate-800 border-r border-gray-200/50 p-5 sticky top-[61px] z-20 transition-colors">
      <div className="flex flex-col items-center justify-center gap-3 mt-3 mb-7">
        {user?.profileImageUrl && (
          <img
            src={user.profileImageUrl}
            alt="Profile"
            className="w-20 h-20 bg-slate-400 rounded-full"
          />
        )}

        <h5 className="text-gray-950 dark:text-slate-100 font-medium leading-6">
          {user?.fullName || ""}
        </h5>
      </div>

      {SIDE_MENU_DATA.map((item, index) => (
        <button
          key={`menu_${index}`}
          className={`w-full flex items-center gap-4 text-[15px] ${
            activeMenu === item.label
              ? "text-white bg-primary"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          } py-3 px-6 rounded-lg mb-3 transition-colors`}
          onClick={() => handleClick(item.path)}
        >
          <item.icon className="text-xl" />
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default SideMenu;
