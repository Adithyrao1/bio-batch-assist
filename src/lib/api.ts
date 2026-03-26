import type {
  PaginatedResponse,
  User,
  UserCreate,
  Area,
  Variety,
  MediaType,
  FindingType,
  Chemical,
  ChemicalCreate,
  MediaPreparation,
  MediaPreparationCreate,
  ContaminationMonitoring,
  ContaminationMonitoringCreate,
  ContaminationReport,
  ContaminationReportCreate,
  InoculationRoom,
  InoculationRoomCreate,
  GrowthRoom,
  GrowthRoomCreate,
  Greenhouse,
  GreenhouseCreate,
  DashboardResponse,
} from '@/types/api';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
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
  
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetchWithAuth('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }
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
};

// ============================================
// GENERIC CRUD HELPERS
// ============================================
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.message || JSON.stringify(error));
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
};

// ============================================
// MASTER DATA APIs
// ============================================
export const areasApi = createCrudApi<Area>('areas');
export const varietiesApi = createCrudApi<Variety>('varieties');
export const mediaTypesApi = createCrudApi<MediaType>('media-types');
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

export const mediaPreparationApi = createCrudApi<MediaPreparation, MediaPreparationCreate>('media-preparation');
export const contaminationMonitoringApi = createCrudApi<ContaminationMonitoring, ContaminationMonitoringCreate>('contamination-monitoring');
export const contaminationReportsApi = createCrudApi<ContaminationReport, ContaminationReportCreate>('contamination-reports');
export const inoculationRoomApi = createCrudApi<InoculationRoom, InoculationRoomCreate>('inoculation-room');
export const growthRoomApi = createCrudApi<GrowthRoom, GrowthRoomCreate>('growth-room');
export const greenhouseApi = createCrudApi<Greenhouse, GreenhouseCreate>('greenhouse');

// ============================================
// DASHBOARD API
// ============================================
export const dashboardApi = {
  async getStats(days: number = 30): Promise<DashboardResponse> {
    const response = await fetchWithAuth(`/dashboard/?days=${days}`);
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
  MediaType,
  FindingType,
  Chemical,
  ChemicalCreate,
  MediaPreparation,
  MediaPreparationCreate,
  ContaminationMonitoring,
  ContaminationMonitoringCreate,
  ContaminationReport,
  ContaminationReportCreate,
  InoculationRoom,
  InoculationRoomCreate,
  GrowthRoom,
  GrowthRoomCreate,
  Greenhouse,
  GreenhouseCreate,
  DashboardResponse,
} from '@/types/api';
