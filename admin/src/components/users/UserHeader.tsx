import React from 'react';
import { UserIcons } from './UserIcons';

interface UserHeaderProps {
  totalCount: number;
  onCreateClick: () => void;
}

/**
 * Page header component for users management
 */
export function UserHeader({ totalCount, onCreateClick }: Readonly<UserHeaderProps>) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b6ef8',
            }}
          >
            <UserIcons.Users />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>Users</h1>
          <span
            style={{
              background: '#eef2ff',
              color: '#3b6ef8',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 9px',
            }}
          >
            {totalCount} total
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#8b92a9', margin: 0 }}>
          Manage accounts, roles and permissions across your platform
        </p>
      </div>

      <button
        onClick={onCreateClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#3b6ef8',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 16px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(59,110,248,0.28)',
          fontFamily: 'inherit',
        }}
      >
        <UserIcons.Plus /> Create User
      </button>
    </div>
  );
}
