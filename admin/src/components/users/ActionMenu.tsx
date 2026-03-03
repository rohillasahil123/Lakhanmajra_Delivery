import { User } from "../../hooks/useUsers";
import { Role } from "../../hooks/useUserInit";

export default function ActionMenu({
  user,
  roles,
  onEdit,
  onDelete,
}: Readonly<{
  user: User;
  roles: Role[];
  onEdit: () => void;
  onDelete: () => void;
}>) {

  return (
    <div className="flex gap-2">
      <button onClick={onEdit}>
        Edit
      </button>
      <button
        onClick={onDelete}
        className="text-red-500"
      >
        Delete
      </button>
    </div>
  );
}