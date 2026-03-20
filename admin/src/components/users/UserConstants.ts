export const ITEMS_PER_PAGE = 8;

export const ROLE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admin' },
  { key: 'manager', label: 'Manager' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'rider', label: 'Rider' },
  { key: 'user', label: 'User' },
];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const PERMISSIONS = {
  UPDATE: 'users:update',
  DELETE: 'users:delete',
  CREATE: 'users:create',
};
