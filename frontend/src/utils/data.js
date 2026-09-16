import {
  LuLayoutDashboard,
  LuHandCoins,
  LuWalletMinimal,
  LuLogOut,
  LuTarget,
  LuFileText,
  LuUser,
} from "react-icons/lu";

export const SIDE_MENU_DATA = [
  {
    id: "00",
    label: "Profile",
    icon: LuUser,
    path: "/profile",
  },
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/dashboard",
  },
  {
    id: "02",
    label: "Income",
    icon: LuWalletMinimal,
    path: "/income",
  },
  {
    id: "03",
    label: "Expense",
    icon: LuHandCoins,
    path: "/expense",
  },
  {
    id: "04",
    label: "Budgets",
    icon: LuTarget,
    path: "/budgets",
  },
  {
    id: "05",
    label: "Transactions",
    icon: LuFileText,
    path: "/transactions",
  },
  {
    id: "06",
    label: "Logout",
    icon: LuLogOut,
    path: "logout",
  },
];
