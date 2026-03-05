import { useState, useRef, useEffect } from "react";

interface RoleBadgeProps {
  role?: string;
  userId?: string;
  isSuperAdmin?: boolean;
  roles: { _id: string; name: string }[];
  hasPermission: (perm: string) => boolean;
  onChangeRole: (userId: string, roleId: string) => void;
}

const RoleBadge = ({
  role,
  userId,
  isSuperAdmin,
  roles,
  hasPermission,
  onChangeRole,
}: RoleBadgeProps) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleColors: Record<string, string> = {
    superadmin: "bg-red-600",
    admin: "bg-blue-600",
    manager: "bg-gray-600",
    vendor: "bg-purple-600",
    rider: "bg-yellow-500",
    user: "bg-green-600",
  };

  const canEdit =
    hasPermission("roles:manage") &&
    role !== "superadmin" &&
    !isSuperAdmin;

  // 🔥 Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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
    <div className="relative inline-block" ref={dropdownRef}>
     <button
  type="button"
  onClick={() => canEdit && setOpen((prev) => !prev)}
  disabled={!canEdit}
  className={`px-3 py-1 text-white text-xs rounded-full transition
  ${canEdit ? "cursor-pointer hover:opacity-80" : "cursor-default"}
  ${roleColors[role] || "bg-gray-400"}
  `}
>
  {role}
</button>

      {open && canEdit && (
        <div className="absolute mt-2 w-40 bg-white shadow-lg rounded-lg border z-30 overflow-hidden">
          {roles
            .filter((r) => r.name !== "superadmin")
            .map((r) => (
              <button
                key={r._id}
                onClick={() => {
                  onChangeRole(userId!, r._id);
                  setOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
              >
                {r.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default RoleBadge;