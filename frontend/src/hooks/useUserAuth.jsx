import { useAuth } from "../context/AuthContext";

export const useUserAuth = () => {
  return useAuth();
};
