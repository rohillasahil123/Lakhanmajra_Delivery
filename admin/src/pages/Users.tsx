import { useState } from "react";
import { useUsers } from "../hooks/useUsers";
import { useUserInit } from "../hooks/useUserInit";
import { useUserFilters } from "../hooks/useUserFilters";

import RoleBadge from "../components/users/RoleBadge";
import Pagination from "../components/users/Pagination";
import ActionMenu from "../components/users/ActionMenu";
import UserModal from "../components/users/UserModal";
import Toast from "../components/users/Toast";

const Users = () => {
  const {
    users,
    total,
    page,
    limit,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleStatus,
    assignRole,
  } = useUsers();

  const { roles, summary, hasPermission } = useUserInit(fetchUsers);
  const { search, setSearch, activeRole, setActiveRole } =
    useUserFilters(fetchUsers);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /* ================= CRUD HANDLERS ================= */

  const handleCreateOrUpdate = async (data: any) => {
    try {
      if (editingUser) {
        await updateUser(editingUser._id, data);
        setToast({ message: "User updated successfully", type: "success" });
      } else {
        await createUser(data);
        setToast({ message: "User created successfully", type: "success" });
      }

      setEditingUser(null);
      fetchUsers({ page });
    } catch {
      setToast({ message: "Operation failed", type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteUser(id);
      setToast({ message: "User deleted", type: "success" });
      fetchUsers({ page });
    } catch {
      setToast({ message: "Delete failed", type: "error" });
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleStatus(id, isActive);
      setToast({ message: "Status updated", type: "success" });
      fetchUsers({ page });
    } catch {
      setToast({ message: "Status update failed", type: "error" });
    }
  };

  const handleAssignRole = async (id: string, roleId: string) => {
    try {
      await assignRole(id, roleId);
      setToast({ message: "Role updated", type: "success" });
      fetchUsers({ page });
    } catch {
      setToast({ message: "Role update failed", type: "error" });
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>

        {hasPermission("users:create") && (
          <button
            onClick={() => {
              setEditingUser(null);
              setModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + Create User
          </button>
        )}
      </div>

      {/* Summary Tabs */}
      {summary && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <button
            onClick={() => setActiveRole(null)}
            className={`px-4 py-2 rounded ${!activeRole ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
          >
            All ({summary.total})
          </button>

          {Object.entries(summary.summary).map(([role, count]) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-4 py-2 rounded ${activeRole === role
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
                }`}
            >
              {role} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border px-3 py-2 rounded w-full mb-4"
      />

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-6">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-6">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="border-t">
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.phone}</td>
                  <td className="p-3">
                    <RoleBadge
                      role={user.roleId?.name}
                      userId={user._id}
                      isSuperAdmin={user.roleId?.name === "superadmin"}
                      roles={roles}
                      hasPermission={hasPermission}
                      onChangeRole={handleAssignRole}
                    />
                  </td>
                  <td className="p-3">
                    {user.isActive ? "Active" : "Inactive"}
                  </td>
                  <td className="p-3 text-right">
                    <ActionMenu
                      user={user}
                      hasPermission={hasPermission}
                      onEdit={(u) => {
                        setEditingUser(u);
                        setModalOpen(true);
                      }}
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={(newPage) => fetchUsers({ page: newPage })}
      />

      {/* Modal */}
      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        roles={roles}
        editingUser={editingUser}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Users;
