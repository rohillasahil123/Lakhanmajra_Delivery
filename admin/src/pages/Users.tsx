import { useState, useCallback } from 'react';
import { useUsers, IUser } from '../hooks/useUsers';
import { useUserInit } from '../hooks/useUserInit';
import { useUserFilters } from '../hooks/useUserFilters';
import Toast from '../components/users/Toast';
import { UserHeader } from '../components/users/UserHeader';
import { UserFilters } from '../components/users/UserFilters';
import { UserTable } from '../components/users/UserTable';
import { UserPagination } from '../components/users/UserPagination';
import { UserForm } from '../components/users/UserForm';
import { ITEMS_PER_PAGE } from '../components/users/UserConstants';
import { getErrorMessage } from '../components/users/UserUtils';


/**
 * Users Management Page
 *
 * Features:
 * - User list with filtering by role and status
 * - Search by name/email
 * - Create/edit/delete users with form validation
 * - Pagination
 * - Toast notifications
 */
export default function Users() {
  const {
    users,
    total,
    page,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers();

  const { roles, summary, hasPermission, loading: initLoading } = useUserInit(fetchUsers);
  const { search, setSearch, activeRole, setActiveRole, resetFilters, debouncedSearch } =
    useUserFilters(fetchUsers);

  // Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePageChange = useCallback(
    (newPage: number) => {
      const statusParam =
        statusFilter !== 'all' ? (statusFilter === 'active' ? 'active' : 'inactive') : undefined;
      fetchUsers({
        page: newPage,
        role: activeRole || undefined,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        status: statusParam,
      });
    },
    [fetchUsers, activeRole, debouncedSearch, statusFilter]
  );

  const handleRoleFilter = useCallback(
    (role: string) => {
      setActiveRole(role === 'all' ? null : role);
    },
    [setActiveRole]
  );

  const handleStatusFilter = useCallback(
    (status: string) => {
      setStatusFilter(status);
      const statusParam = status !== 'all' ? (status === 'active' ? 'active' : 'inactive') : undefined;
      fetchUsers({
        page: 1,
        role: activeRole || undefined,
        search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        status: statusParam,
      });
    },
    [fetchUsers, activeRole, debouncedSearch]
  );

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    try {
      setSubmitting(true);
      if (editingUser) {
        await updateUser(editingUser._id, data);
        setToast({ message: 'User updated successfully', type: 'success' });
      } else {
        await createUser(data);
        setToast({ message: 'User created successfully', type: 'success' });
      }
      setModalOpen(false);
      setEditingUser(null);
      await fetchUsers({ page: 1, role: activeRole || undefined });
    } catch (err) {
      const message = getErrorMessage(err);
      setToast({ message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: IUser) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(userId);
      setToast({ message: 'User deleted successfully', type: 'success' });
      await fetchUsers({ page: 1, role: activeRole || undefined });
    } catch (err) {
      const message = getErrorMessage(err);
      setToast({ message, type: 'error' });
    }
  };


  const handleNewUser = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const countByRole = (role: string): number => {
    if (!summary?.summary) return 0;
    return role === 'all' ? summary.total || 0 : (summary.summary[role] as number) || 0;
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (initLoading) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#8b92a9' }}>Loading...</div>;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '18px 22px', background: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header */}
      <UserHeader totalCount={total} onCreateClick={handleNewUser} />

      {/* Main Card */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e8eaf0',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Filters */}
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          activeRole={activeRole}
          onRoleChange={handleRoleFilter}
          statusFilter={statusFilter}
          onStatusChange={handleStatusFilter}
          roleCountByKey={countByRole}
        />

        {/* Results Meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 16px',
            background: '#fafbfc',
            borderBottom: '1px solid #e8eaf0',
            fontSize: 11.5,
            color: '#8b92a9',
            fontWeight: 500,
          }}
        >
          <span>
            <strong>{total}</strong> users found
          </span>
          {(activeRole || statusFilter !== 'all' || search) && (
            <button
              onClick={() => {
                resetFilters();
                setStatusFilter('all');
              }}
              style={{
                fontSize: 11.5,
                color: '#3b6ef8',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <UserTable
          users={users}
          loading={loading}
          error={error}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          hasPermission={hasPermission}
        />

        {/* Pagination */}
        {total > ITEMS_PER_PAGE && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderTop: '1px solid #e8eaf0',
              background: '#fafbfc',
            }}
          >
            <span style={{ fontSize: 12, color: '#8b92a9', fontWeight: 500 }}>
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of{' '}
              {total} users
            </span>
            <UserPagination
              page={page}
              total={total}
              limit={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserForm
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleFormSubmit}
        roles={roles}
        editingUser={editingUser}
        loading={submitting}
      />

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
