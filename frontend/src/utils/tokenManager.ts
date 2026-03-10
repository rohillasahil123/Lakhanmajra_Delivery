/**
 * AsyncStorage Token Manager
 * Handles secure token storage and retrieval for React Native/Expo
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@lakhanmajra_auth_token';
const USER_KEY = '@lakhanmajra_auth_user';
const TIMESTAMP_KEY = '@lakhanmajra_token_timestamp';

class TokenManager {
  /**
   * Store authentication token
   */
  async storeToken(token: string): Promise<void> {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token format');
      }
      await AsyncStorage.setItem(TOKEN_KEY, token);
      // Store timestamp when token was saved
      await AsyncStorage.setItem(TIMESTAMP_KEY, new Date().toISOString());
      console.log('✅ Token stored successfully');
    } catch (error) {
      console.error('❌ Error storing token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  /**
   * Retrieve stored authentication token
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token && this.isValidToken(token)) {
        return token;
      }
      // If token is invalid or expired, clear storage
      if (token) {
        await this.clearToken();
      }
      return null;
    } catch (error) {
      console.error('❌ Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  async storeUser(user: any): Promise<void> {
    try {
      if (!user || typeof user !== 'object') {
        throw new Error('Invalid user format');
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      console.log('✅ User data stored successfully');
    } catch (error) {
      console.error('❌ Error storing user:', error);
      throw new Error('Failed to store user data');
    }
  }

  /**
   * Retrieve stored user data
   */
  async getUser(): Promise<any | null> {
    try {
      const user = await AsyncStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('❌ Error retrieving user:', error);
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, TIMESTAMP_KEY]);
      console.log('✅ Authentication data cleared');
    } catch (error) {
      console.error('❌ Error clearing token:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  /**
   * Check if token exists
   */
  async hasToken(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token !== null && this.isValidToken(token);
    } catch (error) {
      console.error('❌ Error checking token:', error);
      return false;
    }
  }

  /**
   * Get token timestamp
   */
  async getTokenTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TIMESTAMP_KEY);
    } catch (error) {
      console.error('❌ Error getting token timestamp:', error);
      return null;
    }
  }

  /**
   * Validate token format (basic validation)
   * JWT tokens have 3 parts separated by dots
   */
  private isValidToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    // JWT should have 3 parts: header.payload.signature
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Decode JWT token (without verification - for client-side only)
   * WARNING: Never use for security validation on client side
   */
  decodeToken(token: string): any {
    try {
      if (!this.isValidToken(token)) {
        return null;
      }
      const payload = token.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      return decoded;
    } catch (error) {
      console.error('❌ Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return false; // If we can't decode, assume it's valid
      }
      // exp is in seconds, convert to milliseconds
      const expiryTime = decoded.exp * 1000;
      return new Date().getTime() > expiryTime;
    } catch (error) {
      console.error('❌ Error checking token expiry:', error);
      return false;
    }
  }
}

export const tokenManager = new TokenManager();
