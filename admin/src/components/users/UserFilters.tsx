import { useState } from 'react';
import { ROLE_TABS, STATUS_OPTIONS } from './UserConstants';
import { UserIcons } from './UserIcons';

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeRole: string | null;
  onRoleChange: (role: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  roleCountByKey: (role: string) => number;
}

/**
 * Status dropdown filter component
 */
function StatusDropdown({ value, onChange }: { value: string; onChange: (status: string) => void }) {
  const [open, setOpen] = useState(false);

  const getLabel = () => {
    const opt = STATUS_OPTIONS.find((o) => o.value === value);
    return opt?.label || 'Filter Status';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 11px',
          border: '1px solid #e8eaf0',
          background: open ? '#f5f6fa' : '#fff',
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {getLabel()}
        <UserIcons.ChevDown />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            background: '#fff',
            border: '1px solid #e8eaf0',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            zIndex: 100,
            minWidth: 150,
            padding: 4,
            overflow: 'hidden',
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '7px 11px',
                border: 'none',
                background: value === opt.value ? '#f5f7ff' : 'transparent',
                color: value === opt.value ? '#3b6ef8' : '#0f1623',
                fontSize: 12.5,
                fontWeight: value === opt.value ? 600 : 500,
                cursor: 'pointer',
                borderRadius: 7,
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = 'transparent';
              }}
            >
              {opt.label}
              {value === opt.value && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#3b6ef8' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Count badge for role tabs
 */
function CountBadge({ count }: { count: number }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        opacity: 0.6,
        marginLeft: 4,
      }}
    >
      {count}
    </span>
  );
}

/**
 * User filters component
 * Includes role tabs, search, status filter, and export
 */
export function UserFilters({
  search,
  onSearchChange,
  activeRole,
  onRoleChange,
  statusFilter,
  onStatusChange,
  roleCountByKey,
}: Readonly<UserFiltersProps>) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid #e8eaf0',
        flexWrap: 'wrap',
      }}
    >
      {/* Role Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#f5f6fa',
          border: '1px solid #e8eaf0',
          borderRadius: 8,
          padding: 3,
          gap: 2,
        }}
      >
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onRoleChange(tab.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'all 0.13s',
              background:
                activeRole === tab.key || (tab.key === 'all' && !activeRole)
                  ? '#3b6ef8'
                  : 'transparent',
              color:
                activeRole === tab.key || (tab.key === 'all' && !activeRole)
                  ? '#fff'
                  : '#8b92a9',
              boxShadow:
                activeRole === tab.key || (tab.key === 'all' && !activeRole)
                  ? '0 2px 6px rgba(59,110,248,0.22)'
                  : 'none',
            }}
          >
            {tab.label}
            <CountBadge count={roleCountByKey(tab.key)} />
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 9,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#8b92a9',
            pointerEvents: 'none',
            display: 'flex',
          }}
        >
          <UserIcons.Search />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or email…"
          style={{
            background: '#f5f6fa',
            border: '1px solid #e8eaf0',
            borderRadius: 8,
            fontSize: 12.5,
            color: '#0f1623',
            padding: '6.5px 11px 6.5px 30px',
            width: 210,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b6ef8';
            e.target.style.background = '#fff';
            e.target.style.boxShadow = '0 0 0 3px rgba(59,110,248,0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e8eaf0';
            e.target.style.background = '#f5f6fa';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Status Filter */}
      <StatusDropdown value={statusFilter} onChange={onStatusChange} />

      {/* Export */}
      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          border: '1px solid #e8eaf0',
          background: '#fff',
          color: '#4b5470',
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          padding: '6.5px 12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <UserIcons.Export /> Export
      </button>
    </div>
  );
}
