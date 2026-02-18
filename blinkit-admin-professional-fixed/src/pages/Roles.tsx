import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Shield, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { getPermissions } from '../auth';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import type { Role } from '../types';

const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] });

  const hasPerm = (p: string) => userPermissions.includes(p);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [permsRes, rolesRes, allPermsRes] = await Promise.all([
        getPermissions(),
        api.get('/admin/roles'),
        api.get('/admin/permissions')
      ]);
      setUserPermissions(permsRes);
      setRoles(Array.isArray(rolesRes.data?.data) ? rolesRes.data.data : rolesRes.data || []);
      const permsList = (allPermsRes.data?.data ?? allPermsRes.data ?? []) as any[];
      setAllPermissions(permsList.map((p) => p.name || p));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '', permissions: role.permissions || [] });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
  };

  const togglePermission = (perm: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(perm)
        ? formData.permissions.filter((p) => p !== perm)
        : [...formData.permissions, perm]
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('Role name is required');
      return;
    }
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions
      };
      if (editingRole) {
        await api.put(`/admin/roles/${editingRole._id}`, payload);
      } else {
        await api.post('/admin/roles', payload);
      }
      await loadData();
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save role');
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      await api.delete(`/admin/roles/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete role');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loading size="lg" text="Loading roles..." /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600 mt-1">Define user roles and access control</p>
        </div>
        {hasPerm('roles:create') && (
          <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Create Role</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role._id} className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blinkit-yellow to-blinkit-green">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                  {role.description && <p className="text-sm text-gray-600">{role.description}</p>}
                </div>
              </div>
              {(hasPerm('roles:update') || hasPerm('roles:delete')) && (
                <div className="flex items-center gap-1">
                  {hasPerm('roles:update') && (
                    <button onClick={() => openEditModal(role)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPerm('roles:delete') && role.name !== 'superadmin' && (
                    <button onClick={() => deleteRole(role._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Permissions ({role.permissions?.length || 0})</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.slice(0, 5).map((perm, idx) => (
                  <span key={idx} className="badge badge-info text-xs">{perm}</span>
                ))}
                {(role.permissions?.length || 0) > 5 && (
                  <span className="badge badge-info text-xs">+{(role.permissions?.length || 0) - 5} more</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingRole ? 'Edit Role' : 'Create Role'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., Manager" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} placeholder="Role description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {allPermissions.map((perm) => (
                <label key={perm} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={formData.permissions.includes(perm)} onChange={() => togglePermission(perm)} className="rounded text-blinkit-green" />
                  <span className="text-sm text-gray-700">{perm}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button onClick={closeModal} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn btn-primary">{editingRole ? 'Update' : 'Create'} Role</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Roles;
