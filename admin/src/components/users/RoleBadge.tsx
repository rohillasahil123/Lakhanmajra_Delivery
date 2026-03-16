import { useState, useEffect, useRef } from 'react';

interface Role {
  _id: string;
  name: string;
}

interface Props {
  role: string;
  roles: Role[];
  userId: string;
  onChangeRole: (userId: string, roleId: string) => void;
  hasPermission: (perm: string) => boolean;
}

const roleColors: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700',
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  vendor: 'bg-orange-100 text-orange-700',
  rider: 'bg-yellow-100 text-yellow-700',
  user: 'bg-gray-100 text-gray-700',
};

export default function RoleBadge({
  role,
  roles,
  userId,
  onChangeRole,
  hasPermission,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canEdit = hasPermission('roles:manage') && role !== 'superadmin';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRoleChange = (roleId: string) => {
    onChangeRole(userId, roleId);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => canEdit && setOpen((prev) => !prev)}
        className={`px-2 py-1 text-xs rounded-md font-medium ${
          roleColors[role] ?? 'bg-gray-100 text-gray-700'
        }`}
      >
        {role}
      </button>

      {open && canEdit && (
        <div className="absolute mt-1 w-32 bg-white border rounded shadow">
          {roles
            .filter((r) => r.name !== 'superadmin')
            .map((r) => (
              <button
                key={r._id}
                type="button"
                onClick={() => handleRoleChange(r._id)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                {r.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
