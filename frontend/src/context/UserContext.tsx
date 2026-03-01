import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { clearAuth, getStoredToken, getStoredUser } from "@/api/auth";

interface User {
  id: string;
  name: string;
  phone: string;
  preferredLanguage: string;
}

interface UserContextType {
  user: User | null;
  token: string | null;
  preferredLanguage: string;
  setAuth: (user: User, token: string) => void;
  setPreferredLanguage: (lang: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState("hi");

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setPreferredLanguage(storedUser.preferredLanguage || "hi");
    }
  }, []);

  const setAuth = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    setPreferredLanguage(u.preferredLanguage || "hi");
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setToken(null);
  };

  return (
    <UserContext.Provider value={{
      user, token, preferredLanguage,
      setAuth, setPreferredLanguage, logout,
      isAuthenticated: !!token,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
