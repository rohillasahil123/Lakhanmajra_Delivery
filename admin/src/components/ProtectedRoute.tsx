import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/client';

type Props = { children: React.ReactElement };

export default function ProtectedRoute({ children }: Props) {
  const token = localStorage.getItem('token');
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const res = await api.get('/auth/users');
        const userRole = res.data?.role || res.data?.roleId?.name;
        setRole(userRole);
      } catch (err) {
        console.error('Failed to fetch user role:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [token]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'superadmin') return <Navigate to="/login" replace />;
  return children;
}
