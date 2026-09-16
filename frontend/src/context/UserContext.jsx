import React, { createContext, useState } from "react";
export const UserContext = createContext();

/**
 * UserContext — provides app-level user state (profile photo, display name, etc.)
 * NOTE: Authentication state (login/logout/session) is managed by AuthContext,
 * which uses HTTP-only cookies. Do NOT store auth tokens here.
 */
const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);

  // Update local UI profile state (e.g. after avatar upload)
  const updateUserProfile = (data) => {
    setUserProfile(data);
  };

  const clearUserProfile = () => {
    setUserProfile(null);
  };

  return (
    <UserContext.Provider value={{ userProfile, updateUserProfile, clearUserProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
