import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../utils/apiClient";

const AuthContext = createContext(null);
 
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bootstrappedRef = useRef(false);
  const navigate = useNavigate();

  const clearAuthState = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);
  
  const refreshSession = useCallback(async () => {
    try {
      const data = await apiClient.get("/auth/me");
      if (data?.user) {
        setUser(data.user);
        setError(null);
        return data.user;
      }
      clearAuthState();
      return null;
    } catch (err) {
      clearAuthState();
      return null;
    }
  }, [clearAuthState]);
  
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    
    // Public routes that don't need session restoration redirect
    const PUBLIC_PATHS = ["/login", "/signup"];

    const bootstrap = async () => {
      try {
        const currentUser = await refreshSession();
        // Only redirect to /login if not authenticated AND not already on a public route
        if (!currentUser && !PUBLIC_PATHS.includes(window.location.pathname)) {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Auth bootstrap error:", err);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [navigate, refreshSession]);


  const login = useCallback(async (payload) => {
    setError(null);
    const data = await apiClient.post("/auth/login", payload);
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || "Login failed");
  }, []);

  const signup = useCallback(async (payload) => {
    setError(null);
    const data = await apiClient.post("/auth/signup", payload);
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || "Signup failed");
  }, []);

  const googleLogin = useCallback(async (payload) => {
    setError(null);
    const data = await apiClient.post("/auth/google", payload);
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || "Google login failed");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } catch (err) {
      // Ignore server errors and still clear the client session.
    } finally {
      clearAuthState();
      navigate("/login", { replace: true });
    }
  }, [clearAuthState, navigate]);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    setError,
    login,
    signup,
    googleLogin,
    logout,
    refreshSession,
  }), [user, loading, error, setError, login, signup, googleLogin, logout, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
