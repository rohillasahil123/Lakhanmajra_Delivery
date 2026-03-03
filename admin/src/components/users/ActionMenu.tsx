import { useState, useRef, useEffect } from "react";
import { IUser } from "../../hooks/useUsers";

interface ActionMenuProps {
  user: IUser;
  hasPermission: (perm: string) => boolean;
  onEdit: (user: IUser) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

const ActionMenu = ({
  user,
  hasPermission,
  onEdit,
  onDelete,
  onToggleStatus,
}: ActionMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 🔥 Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 rounded-full hover:bg-gray-200 transition"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-30 overflow-hidden">
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
        </div>
      )}
    </div>
  );
};

export default ActionMenu;