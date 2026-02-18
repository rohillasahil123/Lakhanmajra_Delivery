import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Riders from './pages/Riders';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Roles from './pages/Roles';
import Categories from './pages/Categories';

export default function App() {
  const nav = useNavigate();
  const location = useLocation(); // 👈 add this

  const isLoginPage = location.pathname === '/login'; // 👈 check current route

  const logout = () => {
    localStorage.removeItem('token');
    nav('/login');
  };

  return (
    <div className="min-h-screen">
      <div className="flex">

        {/* 👇 Only show sidebar when NOT on login page */}
        {!isLoginPage && (
          <aside className="w-64 bg-white border-r min-h-screen p-4 hidden md:block">
            <div className="mb-6">
              <div className="text-xl font-bold">Admin</div>
              <div className="text-sm text-slate-500">Dashboard</div>
            </div>
            <nav className="space-y-2 text-sm">
              <Link to="/" className="block p-2 rounded hover:bg-slate-50">Dashboard</Link>
              <Link to="/users" className="block p-2 rounded hover:bg-slate-50">Users</Link>
              <Link to="/riders" className="block p-2 rounded hover:bg-slate-50">Riders</Link>
              <Link to="/products" className="block p-2 rounded hover:bg-slate-50">Products</Link>
              <Link to="/categories" className="block p-2 rounded hover:bg-slate-50">Categories</Link>
              <Link to="/orders" className="block p-2 rounded hover:bg-slate-50">Orders</Link>
              <Link to="/roles" className="block p-2 rounded hover:bg-slate-50">Roles</Link>
              <button onClick={logout} className="mt-4 text-red-600">Sign out</button>
            </nav>
          </aside>
        )}

        <main className="flex-1 bg-slate-50 min-h-screen">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
            <Route path="/riders" element={<ProtectedRoute><Riders /></ProtectedRoute>} />
          </Routes>
        </main>

      </div>
    </div>
  );
}