import { useState } from "react";
import { IUser } from "../../hooks/useUsers";

interface ActionMenuProps {
  user: IUser;
  roles: { _id: string; name: string }[];
  hasPermission: (perm: string) => boolean;
  onEdit: (user: IUser) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onAssignRole: (id: string, roleId: string) => void;
}

const ActionMenu = ({
  user,
  roles,
  hasPermission,
  onEdit,
  onDelete,
  onToggleStatus,
  onAssignRole,
}: ActionMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-20">
          {hasPermission("users:update") && (
            <button
              onClick={() => {
                onEdit(user);
                setOpen(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Edit
            </button>
          )}

          {hasPermission("users:delete") && (
            <button
              onClick={() => {
                onDelete(user._id);
                setOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
            >
              Delete
            </button>
          )}

          {hasPermission("users:update") && (
            <button
              onClick={() => {
                onToggleStatus(user._id, !user.isActive);
                setOpen(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              {user.isActive ? "Deactivate" : "Activate"}
            </button>
          )}

          {hasPermission("roles:manage") && (
            <div className="border-t mt-1">
              {roles.map((role) => (
                <button
                  key={role._id}
                  onClick={() => {
                    onAssignRole(user._id, role._id);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Set as {role.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;