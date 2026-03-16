import {apiClient, setApiToken, setCsrfToken} from './apiClient';
import {AuthSession} from '../types/rider';
import {sessionStorage} from './storage';
import {
  sanitizeEmail,
  sanitizePassword,
  sanitizeFormInput,
} from '../utils/sanitize';

/**
 * SECURITY: Backend returns httpOnly cookie + XSRF token
 * Token is NOT in response body - it's in httpOnly cookie
 * XSRF-TOKEN is in cookie for CSRF protection
 */
interface RiderLoginResponse {
  message: string;
  token?: string; // Legacy - may not be present
  rider: {
    id: string;
    name: string;
    phone: string;
    role: string;
    online?: boolean;
  };
}

interface RiderMeResponse {
  rider: {
    id: string;
    name: string;
    phone: string;
    role: string;
    online?: boolean;
  };
}

export const authService = {
  /**
   * Login rider with email and password
   * 
   * SECURITY: Sanitize inputs before sending to backend
   * Token is in httpOnly cookie (automatic), not returned in response
   */
  async login(email: string, password: string): Promise<AuthSession> {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    /**
     * SECURITY: Sanitize all user inputs before sending
     */
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedPassword = sanitizePassword(password, 6);

    if (!sanitizedEmail) {
      throw new Error('Invalid email format');
    }

    if (!sanitizedPassword) {
      throw new Error('Password must be at least 6 characters');
    }

    const response = await apiClient.post<RiderLoginResponse>('/rider/login', {
      email: sanitizedEmail,
      password: sanitizedPassword,
    });

    if (response.data.rider.role !== 'rider') {
      throw new Error('Access denied: rider role required');
    }

    /**
     * SECURITY: Token is now in httpOnly cookie (set by backend)
     * We don't store or handle it locally
     * Sanitize rider data from backend before storing
     */
    const session: AuthSession = {
      accessToken: '', // Empty - token is in httpOnly cookie
      rider: {
        id: response.data.rider.id,
        name: sanitizeFormInput(response.data.rider.name, 100),
        phone: response.data.rider.phone, // Already validated by backend
        role: 'rider',
        online: Boolean(response.data.rider.online),
      },
    };

    // setApiToken is deprecated - httpOnly cookie is sent automatically
    // Just save session for offline access and UI state
    await sessionStorage.save(session);
    return session;
  },

  async restoreSession(): Promise<AuthSession | null> {
    const session = await sessionStorage.get();
    if (session) {
      // Token restoration not needed - httpOnly cookie is persistent
      // Just restore rider info for UI
    }
    return session;
  },

  /**
   * Validate that user is still authenticated by fetching /rider/me
   * This endpoint will return 401 if httpOnly cookie is invalid/expired
   * 
   * SECURITY: Sanitize response data before storing
   */
  async validateToken(session: AuthSession): Promise<AuthSession> {
    try {
      const response = await apiClient.get<RiderMeResponse>('/rider/me');

      if (response.data.rider.role !== 'rider') {
        throw new Error('Access denied: rider role required');
      }

      /**
       * Update session with fresh rider data from backend
       * Sanitize name to prevent XSS
       * Token refresh happens via httpOnly cookie rotation on backend
       */
      const nextSession: AuthSession = {
        accessToken: '', // Still empty - in httpOnly cookie
        rider: {
          id: response.data.rider.id,
          name: sanitizeFormInput(response.data.rider.name, 100),
          phone: response.data.rider.phone, // Already validated by backend
          role: 'rider',
          online: Boolean(response.data.rider.online),
        },
      };

      await sessionStorage.save(nextSession);
      return nextSession;
    } catch (error: any) {
      // If validation fails (401), clear local session
      if (error.response?.status === 401) {
        await sessionStorage.clear();
      }
      throw error;
    }
  },

  /**
   * SECURITY: Logout clears local session and notifies backend
   * Backend clears httpOnly cookie on its end
   */
  async logout(): Promise<void> {
    try {
      // Notify backend to clear httpOnly cookie
      await apiClient.post('/rider/logout');
    } catch (error) {
      // Even if logout API fails, clear local session
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      await sessionStorage.clear();
      // Clear CSRF token
      setCsrfToken(null);
    }
  },
};
