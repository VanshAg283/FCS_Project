import { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    try {
      const response = await fetch("/api/auth/profile/", {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to fetch profile.");

      const data = await response.json();
      setUser(data);
      setIsLoggedIn(true);
      setIsAdmin(data.is_admin);
    } catch (error) {
      console.error(error);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem("access_token", token);
    setUser(userData);
    setIsLoggedIn(true);
    setIsAdmin(userData.is_admin);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, user, login, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
