import { IUser } from '../../hooks/useUsers';
import { UserTableRow } from './UserTableRow';

interface UserTableProps {
  users: IUser[];
  loading: boolean;
  error: string | null;
  onEdit: (user: IUser) => void;
  onDelete: (id: string) => void;
  hasPermission: (perm: string) => boolean;
}

/**
 * User table component
 * Renders table header, rows, and empty/loading states
 */
export function UserTable({
  users,
  loading,
  error,
  onEdit,
  onDelete,
  hasPermission,
}: Readonly<UserTableProps>) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e8eaf0' }}>
            <th
              style={{
                padding: '9px 14px 9px 16px',
                textAlign: 'left',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.7px',
                color: '#8b92a9',
                fontFamily: 'inherit',
              }}
            >
              User
            </th>
            <th
              style={{
                padding: '9px 14px',
                textAlign: 'left',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.7px',
                color: '#8b92a9',
                fontFamily: 'inherit',
              }}
            >
              Phone
            </th>
            <th
              style={{
                padding: '9px 14px',
                textAlign: 'left',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.7px',
                color: '#8b92a9',
                fontFamily: 'inherit',
              }}
            >
              Role
            </th>
            <th
              style={{
                padding: '9px 14px',
                textAlign: 'left',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.7px',
                color: '#8b92a9',
                fontFamily: 'inherit',
              }}
            >
              Status
            </th>
            <th
              style={{
                padding: '9px 16px 9px 14px',
                textAlign: 'right',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.7px',
                color: '#8b92a9',
                fontFamily: 'inherit',
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={5}
                style={{ textAlign: 'center', padding: '40px 20px', color: '#8b92a9' }}
              >
                Loading...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td
                colSpan={5}
                style={{ textAlign: 'center', padding: '40px 20px', color: '#ef4444' }}
              >
                {error}
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, color: '#0f1623', marginBottom: 4 }}
                  >
                    No users found
                  </div>
                  <div style={{ fontSize: 12.5, color: '#8b92a9' }}>
                    Try adjusting your search or filter criteria
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <UserTableRow
                key={user._id}
                user={user}
                onEdit={onEdit}
                onDelete={onDelete}
                hasPermission={hasPermission}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
