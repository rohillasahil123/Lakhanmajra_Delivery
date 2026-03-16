/**
 * Format date string to readable format
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

/**
 * Get status label based on active state
 */
export const getStatusLabel = (isActive: boolean): string => {
  return isActive ? 'Active' : 'Inactive';
};

/**
 * Get status color based on active state
 */
export const getStatusColor = (isActive: boolean): { text: string; bg: string } => {
  return isActive ? { text: '#12b76a', bg: '#d1fae5' } : { text: '#ef4444', bg: '#fee2e2' };
};

/**
 * Get display name for a role
 */
export const getRoleDisplayName = (roleKey: string): string => {
  const roleMap: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    vendor: 'Vendor',
    rider: 'Rider',
    user: 'User',
  };
  return roleMap[roleKey] || roleKey;
};

/**
 * Extract error message from error object
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'Something went wrong';
};
