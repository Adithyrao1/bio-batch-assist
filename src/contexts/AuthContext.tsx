import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "technician" | "viewer";

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  hasPermission: (action: "view" | "create" | "edit" | "delete") => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const mockUsers: Record<string, { password: string; user: User }> = {
  admin: {
    password: "admin123",
    user: { id: "1", name: "Dr. Sarah Chen", username: "admin", role: "admin" },
  },
  tech: {
    password: "tech123",
    user: { id: "2", name: "James Rivera", username: "tech", role: "technician" },
  },
  viewer: {
    password: "viewer123",
    user: { id: "3", name: "Maria Santos", username: "viewer", role: "viewer" },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, password: string): boolean => {
    const entry = mockUsers[username];
    if (entry && entry.password === password) {
      setUser(entry.user);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const hasPermission = (action: "view" | "create" | "edit" | "delete"): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "technician") return action !== "delete";
    return action === "view";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
