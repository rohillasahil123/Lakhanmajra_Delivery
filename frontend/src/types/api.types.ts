/**
 * API Response Type Definitions
 * Standard API response structures
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

export interface ApiListResponse<T = any> {
  data: T[];
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export interface ApiPaginationParams {
  limit?: number;
  skip?: number;
  page?: number;
}

export interface ApiSortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiFilterParams extends ApiPaginationParams, ApiSortParams {
  [key: string]: any;
}

export interface ApiErrorWithStatus extends Error {
  status?: number;
  code?: string;
  details?: Record<string, any>;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export class ApiError extends Error implements ApiErrorWithStatus {
  status?: number;
  code?: string;
  details?: Record<string, any>;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
