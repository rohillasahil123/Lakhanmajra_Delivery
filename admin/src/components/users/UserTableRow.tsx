import React, { useState } from 'react';
import { IUser } from '../../hooks/useUsers';
import Avatar from './Avatar';
import RoleBadge from './RoleBadge';
import { ActionIconButton } from './ActionIconButton';
import { UserIcons } from './UserIcons';
import { getStatusLabel, getStatusColor } from './UserUtils';

interface UserTableRowProps {
  user: IUser;
  onEdit: (user: IUser) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

/**
 * Individual user table row component
 * Handles rendering user data and action buttons
 */
export function UserTableRow({
  user,
  onEdit,
  onDelete,
  onToggleStatus,
  hasPermission,
}: Readonly<UserTableRowProps>) {
  const [hovering, setHovering] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(true);
      await onToggleStatus(user._id, !user.isActive);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <tr
      style={{
        borderBottom: '1px solid #e8eaf0',
        transition: 'background 0.1s',
        background: hovering ? '#fafbff' : '#fff',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* User Name & Email */}
      <td style={{ padding: '10px 14px 10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar name={user.name} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f1623' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#8b92a9', marginTop: 1 }}>{user.email}</div>
          </div>
        </div>
      </td>

      {/* Phone */}
      <td style={{ padding: '10px 14px', color: '#4b5470', fontSize: 12.5 }}>{user.phone}</td>

      {/* Role */}
      <td style={{ padding: '10px 14px' }}>
        <RoleBadge
          role={user.roleId?.name || '—'}
          roles={[]}
          userId={user._id}
          onChangeRole={() => {}}
          hasPermission={hasPermission}
        />
      </td>

      {/* Status */}
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: getStatusColor(user.isActive).text,
            }}
          />
          <span
            style={{ fontSize: 12.5, fontWeight: 500, color: getStatusColor(user.isActive).text }}
          >
            {getStatusLabel(user.isActive)}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td style={{ padding: '10px 16px 10px 14px', textAlign: 'right' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
            opacity: hovering ? 1 : 0,
            transition: 'opacity 0.12s',
            pointerEvents: hovering ? 'auto' : 'none',
          }}
        >
          {/* Edit Button */}
          {hasPermission('users:update') && (
            <ActionIconButton title="Edit" onClick={() => onEdit(user)} disabled={actionLoading}>
              <UserIcons.Edit />
            </ActionIconButton>
          )}

          {/* Delete Button */}
          {hasPermission('users:delete') && (
            <ActionIconButton
              title="Delete"
              onClick={() => onDelete(user._id)}
              danger
              disabled={actionLoading}
            >
              <UserIcons.Trash />
            </ActionIconButton>
          )}
        </div>
      </td>
    </tr>
  );
}
