import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/client';
import { logErrorSafely } from '../utils/errorHandler';

type Props = { children: React.ReactElement };
type ErrorType = 'auth' | 'network' | null;

/**
 * Protected Route Component
 * 
 * SECURITY: With httpOnly cookies, we cannot check for token existence in JavaScript
 * Instead, we verify authentication by:
 * 1. Attempting to fetch user info from backend
 * 2. If 401 is returned, user is not authenticated
 * 3. Checking if role is 'superadmin'
 */
export default function ProtectedRoute({ children }: Props) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<ErrorType>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await api.get('/auth/users');
        const userRole = res.data?.role || res.data?.roleId?.name;
        setRole(userRole);
        setAuthChecked(true);
        setError(null);
        setRetryCount(0);
      } catch (err: any) {
        const status = err?.response?.status;

        // 401/403 means authentication/authorization failed - redirect to login
        if (status === 401 || status === 403) {
          setRole(null);
          setAuthChecked(true);
          setError('auth');
          logErrorSafely('ProtectedRoute: Auth check failed', err);
        } else {
          // Network or other errors - allow retry
          setError('network');
          logErrorSafely('ProtectedRoute: Network error during auth check', err);

          // Auto-retry with exponential backoff (max 3 times)
          if (retryCount < maxRetries) {
            const delayMs = Math.min(1000 * Math.pow(2, retryCount), 8000); // 1s, 2s, 4s, then cap
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              fetchUserRole();
            }, delayMs);
            return;
          } else {
            // Max retries exceeded - show error UI
            setAuthChecked(true);
            setRole(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [retryCount]);

  // Still loading user info
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Network error - show error UI with retry option
  if (error === 'network' && retryCount >= maxRetries) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.251a.75.75 0 0 0 1.06 1.06M15.75 7.75a.75.75 0 1 0-1.06-1.06M12 20.25c4.56 0 8.25-3.69 8.25-8.25S16.56 3.75 12 3.75 3.75 7.44 3.75 12s3.69 8.25 8.25 8.25z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h1>
          <p className="text-gray-600 mb-6">
            Unable to verify your access. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => {
              setRetryCount(0);
              setLoading(true);
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry
          </button>
          <button
            onClick={() => (window.location.href = '/login')}
            className="w-full mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated (401/403) - redirect to login
  if (!authChecked || !role || error === 'auth') {
    return <Navigate to="/login" replace />;
  }

  // Not superadmin - redirect to login
  if (role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  // Authenticated and authorized
  return children;
}
