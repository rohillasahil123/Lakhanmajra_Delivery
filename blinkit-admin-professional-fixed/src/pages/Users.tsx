import React, { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, UserPlus } from 'lucide-react';
import api from '../api/client';
import { getMe, getPermissions } from '../auth';
import { formatDateTime, debounce } from '../utils/helpers';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import type { User, Role } from '../types';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [userSummary, setUserSummary] = useState<Record<string, number>>({});
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  const isSuperAdmin = currentRole === 'superadmin';
  const hasPerm = (p: string) => isSuperAdmin || permissions.includes(p);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (permissions.includes('users:view') || isSuperAdmin) {
      loadUsers();
    }
  }, [page, roleFilter]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [meRes, permsRes, rolesRes] = await Promise.all([
        getMe(),
        getPermissions(),
        api.get('/admin/roles')
      ]);

      const roleName = meRes?.roleId?.name || meRes?.role || meRes?.data?.roleId?.name || meRes?.data?.role;
      setCurrentRole(roleName);
      setPermissions(permsRes);
      setRoles(Array.isArray(rolesRes.data?.data) ? rolesRes.data.data : rolesRes.data || []);

      if (permsRes.includes('users:view') || roleName === 'superadmin') {
        await Promise.all([loadUsers(), loadSummary()]);
      } else {
        setUsers([meRes?.data || meRes]);
        setTotal(1);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (pageNum = page) => {
    try {
      const roleParam = roleFilter ? `&role=${roleFilter}` : '';
      const searchParam = search ? `&q=${search}` : '';
      const res = await api.get(`/admin/users?page=${pageNum}&limit=${limit}${roleParam}${searchParam}`);
      
      const payload = Array.isArray(res.data?.users)
        ? res.data.users
        : Array.isArray(res.data?.data?.users)
        ? res.data.data.users
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setUsers(payload);
      setTotal(res.data?.total ?? res.data?.data?.total ?? payload.length);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get('/admin/users/summary');
      setUserSummary(res.data?.data?.summary || res.data?.summary || {});
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const handleSearch = debounce((value: string) => {
    setSearch(value);
    setPage(1);
    loadUsers(1);
  }, 500);

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setSelectedRole(typeof user.roleId === 'object' ? user.roleId._id : user.roleId || '');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setSelectedRole('');
  };

  const updateUserRole = async () => {
    if (!editingUser || !selectedRole) return;
    
    try {
      await api.patch(`/auth/users/${editingUser._id}/role`, { roleId: selectedRole });
      await Promise.all([loadUsers(), loadSummary()]);
      closeEditModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/auth/users/${id}`);
      await Promise.all([loadUsers(), loadSummary()]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const resolveRoleName = (user: User): string => {
    if (!user.roleId) return '—';
    if (typeof user.roleId === 'object') return user.roleId.name;
    const role = roles.find(r => r._id === user.roleId);
    return role?.name || '—';
  };

  const filteredUsers = useMemo(() => {
    if (!roleFilter) return users;
    return users.filter(u => resolveRoleName(u).toLowerCase() === roleFilter.toLowerCase());
  }, [users, roleFilter, roles]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loading size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600 mt-1">Manage all platform users and their roles</p>
        </div>
        {hasPerm('users:create') && (
          <button className="btn btn-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Role Filter Tabs */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-gray-500" />
          <button
            onClick={() => {
              setRoleFilter(null);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !roleFilter
                ? 'bg-blinkit-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Users ({total})
          </button>
          {Object.entries(userSummary).map(([role, count]) => (
            <button
              key={role}
              onClick={() => {
                setRoleFilter(role);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                roleFilter === role
                  ? 'bg-blinkit-green text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or phone..."
            onChange={(e) => handleSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                {(hasPerm('users:update') || hasPerm('users:delete')) && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="font-medium text-gray-900">{user.name}</td>
                  <td className="text-gray-600">{user.email || user.phone || '—'}</td>
                  <td>
                    <span className="badge badge-info">
                      {resolveRoleName(user)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-gray-600 text-sm">
                    {user.createdAt ? formatDateTime(user.createdAt) : '—'}
                  </td>
                  {(hasPerm('users:update') || hasPerm('users:delete')) && (
                    <td>
                      <div className="flex items-center gap-2">
                        {hasPerm('users:update') && (
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPerm('users:delete') && (
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => loadUsers(page - 1)}
              className="btn btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => loadUsers(page + 1)}
              className="btn btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={closeEditModal}
        title={`Edit User Role - ${editingUser?.name}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button onClick={closeEditModal} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              onClick={updateUserRole} 
              className="btn btn-primary"
              disabled={!selectedRole}
            >
              Update Role
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
