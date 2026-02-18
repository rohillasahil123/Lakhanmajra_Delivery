import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Riders from './pages/Riders';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Roles from './pages/Roles';
import Categories from './pages/Categories';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen overflow-hidden">
                <Sidebar 
                  isOpen={sidebarOpen} 
                  onClose={() => setSidebarOpen(false)} 
                />
                
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                  
                  <main className="flex-1 overflow-y-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/riders" element={<Riders />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/roles" element={<Roles />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
