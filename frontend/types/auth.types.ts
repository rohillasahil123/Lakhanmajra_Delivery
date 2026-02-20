/**
 * Auth Types & Interfaces
 * Define all authentication-related types for type safety
 */

// ============ USER TYPES ============
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  roleId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============ AUTH REQUEST TYPES ============
export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginRequest {
  identifier: string; // Can be email or phone
  password: string;
}

// ============ AUTH RESPONSE TYPES ============
export interface RegisterResponse {
  success?: boolean;
  message: string;
  user: User;
}

export interface LoginResponse {
  success?: boolean;
  token: string;
  user: User;
}

export interface GetUserResponse {
  success?: boolean;
  _id: string;
  name: string;
  email: string;
  phone: string;
  roleId?: string;
  role?: string;
}

export interface PermissionsResponse {
  success?: boolean;
  permissions: string[];
}

// ============ ERROR TYPES ============
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// ============ AUTH STATE TYPES ============
export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// ============ API REQUEST/RESPONSE TYPES ============
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  register: (data: RegisterRequest) => Promise<{ success: boolean; message: string }>;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  getUser: () => Promise<User | null>;
  getPermissions: () => Promise<string[]>;
  clearError: () => void;
}
