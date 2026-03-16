import { useState, useRef, useEffect } from 'react';
import { IUser } from '../../hooks/useUsers';

interface Props {
  user: IUser;
  onEdit: (user: IUser) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, status: boolean) => void;
  hasPermission: (perm: string) => boolean;
}

export default function ActionMenu({
  user,
  onEdit,
  onDelete,
  onToggleStatus,
  hasPermission,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-2 py-1 rounded hover:bg-gray-200"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white border rounded shadow">
          {hasPermission('users:update') && (
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            >
              Edit
            </button>
          )}

          {hasPermission('users:delete') && (
            <button
              type="button"
              onClick={() => onDelete(user._id)}
              className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Delete
            </button>
          )}

          {hasPermission('users:update') && (
            <button
              type="button"
              onClick={() => onToggleStatus(user._id, !user.isActive)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
