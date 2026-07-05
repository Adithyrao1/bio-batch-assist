import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMsal } from "@azure/msal-react";
import { authApi, LoginResponse } from "@/lib/api";
import { loginRequest } from "@/lib/authConfig";

export type UserRole = "admin" | "technician" | "viewer";

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  is_onboarded: boolean;
  profile_picture?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (data: { username: string; password: string; password_confirm: string; first_name: string; last_name: string; email: string; employee_id: string; mobile_number: string; profile_picture?: File | null }) => Promise<{ success: boolean; error?: string }>;
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
    is_onboarded: apiUser.is_onboarded ?? true,
    profile_picture: apiUser.profile_picture,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { instance, inProgress } = useMsal();

  // Handle MSAL redirect and token exchange
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        if (response && response.idToken) {
          setIsLoading(true);
          const apiResponse = await authApi.entraLogin(response.idToken);
          const transformedUser = transformUser(apiResponse.user);
          authApi.setStoredUser(apiResponse.user);
          setUser(transformedUser);
        } else if (instance.getAllAccounts().length > 0 && !authApi.isAuthenticated()) {
          setIsLoading(true);
          const account = instance.getAllAccounts()[0];
          try {
            const tokenResponse = await instance.acquireTokenSilent({
              ...loginRequest,
              account,
            });
            const apiResponse = await authApi.entraLogin(tokenResponse.idToken);
            const transformedUser = transformUser(apiResponse.user);
            authApi.setStoredUser(apiResponse.user);
            setUser(transformedUser);
          } catch (silentError) {
            console.error("Silent token acquisition failed:", silentError);
          }
        }
      } catch (error) {
        console.error("MSAL redirect error:", error);
      } finally {
        if (inProgress === "none") {
          setIsLoading(false);
        }
      }
    };
    handleRedirect();
  }, [instance, inProgress]);

  // Auto-logout when JWT refresh fails in any API call
  useEffect(() => {
    const handler = () => {
      authApi.clearStoredUser();
      setUser(null);
    };
    window.addEventListener('auth:token-expired', handler);
    return () => window.removeEventListener('auth:token-expired', handler);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = authApi.getStoredUser();
    if (storedUser && authApi.isAuthenticated()) {
      setUser(transformUser(storedUser));
    }
    if (inProgress === "none") {
      setIsLoading(false);
    }
  }, [inProgress]);

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

  const signup = async (data: { username: string; password: string; password_confirm: string; first_name: string; last_name: string; email: string; employee_id: string; mobile_number: string; profile_picture?: File | null }): Promise<{ success: boolean; error?: string }> => {
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
