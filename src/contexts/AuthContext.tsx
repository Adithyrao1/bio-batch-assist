import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, LoginResponse } from "@/lib/api";

export type UserRole = "admin" | "technician" | "viewer";

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (data: { username: string; password: string; password_confirm: string; first_name: string; last_name: string; email: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (action: "view" | "create" | "edit" | "delete") => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function transformUser(apiUser: LoginResponse['user']): User {
  return {
    id: apiUser.id,
    name: `${apiUser.first_name} ${apiUser.last_name}`.trim() || apiUser.username,
    username: apiUser.username,
    email: apiUser.email,
    role: apiUser.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = authApi.getStoredUser();
    if (storedUser && authApi.isAuthenticated()) {
      setUser(transformUser(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login(username, password);
      const transformedUser = transformUser(response.user);
      authApi.setStoredUser(response.user);
      setUser(transformedUser);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (data: { username: string; password: string; password_confirm: string; first_name: string; last_name: string; email: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authApi.signup(data);
      const transformedUser = transformUser(response.user);
      authApi.setStoredUser(response.user);
      setUser(transformedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Signup failed' };
    }
  };

  const logout = async () => {
    await authApi.logout();
    authApi.clearStoredUser();
    setUser(null);
  };

  const hasPermission = (action: "view" | "create" | "edit" | "delete"): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "technician") return action !== "delete";
    return action === "view";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
