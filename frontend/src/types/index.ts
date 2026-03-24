/**
 * Type Definitions Index
 * Central export point for all TypeScript types
 *
 * Usage:
 * import { Product, Order, CartItem } from '@/types';
 */

// Authentication
export type {
	User,
	RegisterRequest,
	LoginRequest,
	RegisterResponse,
	LoginResponse,
	GetUserResponse,
	PermissionsResponse,
	AuthState,
	AuthContextType,
	ApiError as AuthApiError,
	ApiResponse as AuthApiResponse,
} from './auth.types';

// Products
export * from './product.types';

// Orders
export * from './order.types';

// Cart
export * from './cart.types';

// Offers
export * from './offer.types';

// Notifications
export * from './notification.types';

// Location
export * from './location.types';

// API
export * from './api.types';
