import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/client';

type Props = { children: React.ReactElement };

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

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await api.get('/auth/users');
        const userRole = res.data?.role || res.data?.roleId?.name;
        setRole(userRole);
        setAuthChecked(true);
        setLoading(false);
      } catch (err) {
        // 401 means not authenticated
        // Any other error also means access denied
        setRole(null);
        setAuthChecked(true);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

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

  // Not authenticated - redirect to login
  // (api/client.ts will also handle 401 and redirect automatically)
  if (!authChecked || !role) {
    return <Navigate to="/login" replace />;
  }

  // Not superadmin - redirect to login
  if (role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  // Authenticated and authorized
  return children;
}
