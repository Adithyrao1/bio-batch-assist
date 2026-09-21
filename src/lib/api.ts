import type {
  PaginatedResponse,
  User,
  UserCreate,
  Area,
  Variety,
  FindingType,
  Chemical,
  ChemicalCreate,
  InitiationLog, InitiationLogCreate, MultiplicationLog, MultiplicationLogCreate, RootingLog, RootingLogCreate, HardeningLog, HardeningLogCreate, TransplantationLog, TransplantationLogCreate,
  DashboardResponse,
  StockSolution,
  StockSolutionCreate,
  StockSolutionPreparation,
  StockSolutionPreparationCreate,
  StockSolutionRecipeItem,
  StockSolutionRecipeItemCreate,
  RecentActivity,
  RecentActivityCreate
} from '@/types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? `${window.location.protocol}//${window.location.hostname}:8000/api`;

// Token management
const getAccessToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');
const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};
const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Fetch wrapper with auth
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  
  // If unauthorized, try refreshing the token
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }
  
  return response;
}

// Refresh access token
async function refreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  
  clearTokens();
  return false;
}

// ============================================
// AUTH API
// ============================================
  export interface LoginResponse {
    access: string;
    refresh: string;
    user: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      email: string;
      role: 'admin' | 'technician' | 'viewer';
      is_onboarded: boolean;
      profile_picture?: string | null;
    };
  }

export interface SignupData {
  username: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  email: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const data: LoginResponse = await response.json();
    setTokens(data.access, data.refresh);
    return data;
  },

  async entraLogin(idToken: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/entra-login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const data: LoginResponse = await response.json();
    setTokens(data.access, data.refresh);
    return data;
  },
  
  async requestOTP(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/request-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send OTP');
    }
    
    return response.json();
  },
  
  async verifyOTP(email: string, otp: string, firstName: string, lastName: string): Promise<{ message: string; username: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, first_name: firstName, last_name: lastName }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid OTP');
    }
    
    return response.json();
  },
  
  async signup(data: SignupData): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.username?.[0] || error.password?.[0] || error.error || 'Signup failed');
    }
    
    const responseData: LoginResponse = await response.json();
    setTokens(responseData.access, responseData.refresh);
    return responseData;
  },
  
  async logout(): Promise<void> {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await fetchWithAuth('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    clearTokens();
  },
  
  async getProfile(): Promise<User> {
    const response = await fetchWithAuth('/auth/profile/');
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },
  
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await fetchWithAuth('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  async patchProfile(data: Partial<User>): Promise<User> {
    const response = await fetchWithAuth('/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.username?.[0] || err.detail || 'Failed to update profile');
    }
    return response.json();
  },

  async uploadProfilePicture(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    // We don't want fetchWithAuth to set Content-Type: application/json for FormData
    // So we handle the request manually or clear Content-Type
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {
      // Let browser set the Content-Type boundary
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload profile picture');
    }
    return response.json();
  },
  

  async requestSignupOTP(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/request-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send verification code');
    }
  },

  async verifySignupOTP(email: string, otp: string): Promise<{ email_verified: boolean; verification_token: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid or expired code');
    }
    return response.json();
  },

  async completeSignup(data: {
    verification_token: string;
    first_name: string;
    last_name: string;
    employee_id: string;
    mobile_number: string;
    gender: string;
  }): Promise<{ message: string; username: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/complete-signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete signup');
    }
    return response.json();
  },

  async forgotPasswordRequestOTP(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/request-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send reset code');
    }
    return response.json();
  },

  async forgotPasswordReset(email: string, otp: string, new_password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password }),
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }
    return response.json();
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },

  getStoredUser(): LoginResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  setStoredUser(user: LoginResponse['user']): void {
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearStoredUser(): void {
    localStorage.removeItem('user');
  },

  async getPendingUsers(): Promise<{ pending_users: Array<{ id: number; username: string; first_name: string; last_name: string; email: string; role: string; date_joined: string }>; count: number }> {
    const response = await fetchWithAuth('/auth/admin/pending-users/');
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch pending users');
    }
    return response.json();
  },

  async approveUser(userId: number, role: 'technician' | 'admin'): Promise<{ message: string }> {
    const response = await fetchWithAuth('/auth/admin/approve-user/', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve user');
    }
    return response.json();
  },
};

// ============================================
// GENERIC CRUD HELPERS
// ============================================
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    // DRF can return errors as: array ["msg"], object {detail:"msg"}, or field errors {field:["msg"]}
    if (Array.isArray(error)) {
      throw new Error(error.join(' '));
    }
    throw new Error(error.detail || error.message || Object.values(error).flat().join(' ') || 'Request failed');
  }
  if (response.status === 204) return {} as T;
  return response.json();
}

function createCrudApi<T, TCreate = Partial<T>>(endpoint: string) {
  return {
    async getAll(params?: Record<string, string | number>): Promise<PaginatedResponse<T>> {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          searchParams.append(key, String(value));
        });
      }
      const url = `/${endpoint}/${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetchWithAuth(url);
      return handleResponse(response);
    },
    
    async getById(id: number): Promise<T> {
      const response = await fetchWithAuth(`/${endpoint}/${id}/`);
      return handleResponse(response);
    },
    
    async create(data: TCreate): Promise<T> {
      const response = await fetchWithAuth(`/${endpoint}/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    
    async update(id: number, data: Partial<TCreate>): Promise<T> {
      const response = await fetchWithAuth(`/${endpoint}/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    
    async delete(id: number): Promise<void> {
      const response = await fetchWithAuth(`/${endpoint}/${id}/`, {
        method: 'DELETE',
      });
      await handleResponse(response);
    },
  };
}

// ============================================
// USER API
// ============================================
export const usersApi = {
  ...createCrudApi<User, UserCreate>('users'),

  async updateRole(id: number, data: { role?: string; status?: string }): Promise<User> {
    const response = await fetchWithAuth(`/users/${id}/update-role/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};

// ============================================
// MASTER DATA APIs
// ============================================
export const areasApi = createCrudApi<Area>('areas');
export const varietiesApi = createCrudApi<Variety>('varieties');
export const findingTypesApi = createCrudApi<FindingType>('finding-types');

// ============================================
// OPERATIONAL APIs
// ============================================
export const chemicalsApi = {
  ...createCrudApi<Chemical, ChemicalCreate>('chemicals'),
  
  async adjustStock(id: number, amount: number): Promise<Chemical> {
    const response = await fetchWithAuth(`/chemicals/${id}/adjust_stock/`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },
};

export const stockSolutionsApi = createCrudApi<StockSolution, StockSolutionCreate>('stock-solutions');
export const stockPreparationsApi = createCrudApi<StockSolutionPreparation, StockSolutionPreparationCreate>('stock-preparations');
export const stockRecipeItemsApi = createCrudApi<StockSolutionRecipeItem, StockSolutionRecipeItemCreate>('stock-recipes');
export const initiationApi = createCrudApi<InitiationLog, InitiationLogCreate>('initiation');
export const multiplicationApi = createCrudApi<MultiplicationLog, MultiplicationLogCreate>('multiplication');
export const rootingApi = createCrudApi<RootingLog, RootingLogCreate>('rooting');
export const hardeningApi = createCrudApi<HardeningLog, HardeningLogCreate>('hardening');
export const transplantationApi = createCrudApi<TransplantationLog, TransplantationLogCreate>('transplantation');
export const recentActivityApi = createCrudApi<RecentActivity, RecentActivityCreate>('recent-activity');

export const expenseCategoriesApi = createCrudApi<any, any>('expense-categories');
export const expensesApi = createCrudApi<any, any>('expenses');

// ============================================
// MANPOWER API (admin only)
// ============================================
import type { ManpowerExpense, ManpowerExpenseCreate, ManpowerListResponse } from '@/types/api';

export const manpowerApi = {
  async getAll(params?: Record<string, string | number>): Promise<ManpowerListResponse> {
    const searchParams = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => searchParams.append(k, String(v)));
    const url = `/manpower/${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetchWithAuth(url);
    return handleResponse(response);
  },

  async create(data: ManpowerExpenseCreate): Promise<ManpowerExpense> {
    const response = await fetchWithAuth('/manpower/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async update(id: number, data: Partial<ManpowerExpenseCreate>): Promise<ManpowerExpense> {
    const response = await fetchWithAuth(`/manpower/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetchWithAuth(`/manpower/${id}/`, { method: 'DELETE' });
    await handleResponse(response);
  },
};

// ============================================
// TASKS API (admin only)
// ============================================
export const tasksApi = {
  async triggerWeeklyDigest(): Promise<string> {
    const response = await fetchWithAuth('/tasks/trigger-weekly-digest/', { method: 'POST' });
    const data = await handleResponse<{ detail: string }>(response);
    return data.detail;
  },

  async triggerChemicalExpiryDigest(): Promise<string> {
    const response = await fetchWithAuth('/tasks/trigger-chemical-expiry-digest/', { method: 'POST' });
    const data = await handleResponse<{ detail: string }>(response);
    return data.detail;
  },
};

// ============================================
// DASHBOARD API
// ============================================
export const dashboardApi = {
  async getStats(params: { days?: number; from_date?: string; to_date?: string } = {}): Promise<DashboardResponse> {
    const q = new URLSearchParams();
    if (params.from_date && params.to_date) {
      q.set('from_date', params.from_date);
      q.set('to_date', params.to_date);
    } else if (params.days !== undefined) {
      q.set('days', String(params.days));
    }
    const response = await fetchWithAuth(`/dashboard/?${q.toString()}`);
    return handleResponse(response);
  },
};

// Re-export types for convenience
export type {
  PaginatedResponse,
  User,
  UserCreate,
  Area,
  Variety,
  FindingType,
  Chemical,
  ChemicalCreate,
  InitiationLog, InitiationLogCreate, MultiplicationLog, MultiplicationLogCreate, RootingLog, RootingLogCreate, HardeningLog, HardeningLogCreate, TransplantationLog, TransplantationLogCreate,
  RecentActivity,
  RecentActivityCreate,
  DashboardResponse,
  StockSolution,
  StockSolutionCreate,
  StockSolutionPreparation,
  StockSolutionPreparationCreate,
  StockSolutionRecipeItem,
  StockSolutionRecipeItemCreate,
  ExpenseCategory,
  ExpenseCategoryCreate,
  Expense,
  ExpenseCreate,
  ManpowerExpense,
  ManpowerExpenseCreate,
  ManpowerListResponse
} from '@/types/api';
