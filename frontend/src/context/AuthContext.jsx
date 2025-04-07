import { createContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      let response = await fetch("/api/auth/profile/", {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (response.status === 401 && refreshToken) {
        // Token expired, try to refresh
        const refreshResponse = await fetch("/api/auth/token/refresh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json();
          localStorage.setItem("access_token", newTokens.access);

          // Retry with new token
          response = await fetch("/api/auth/profile/", {
            headers: { "Authorization": `Bearer ${newTokens.access}` },
          });
        } else {
          // If refresh fails, logout
          logout();
          setLoading(false);
          return;
        }
      }

      if (!response.ok) {
        throw new Error("Failed to fetch profile.");
      }

      const data = await response.json();
      setUser(data);
      setIsLoggedIn(true);
      setIsAdmin(data.is_admin);
    } catch (error) {
      console.error("Profile fetch error:", error);
      logout();
    } finally {
      setLoading(false);
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
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAdmin,
        user,
        login,
        logout,
        fetchProfile,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
