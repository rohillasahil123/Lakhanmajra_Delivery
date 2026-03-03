import { User } from "../../hooks/useUsers";

export default function UserModal({
  user,
  onClose,
}: Readonly<{
  user: User | null;
  onClose: () => void;
}>) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl">
        <h2 className="text-lg font-semibold">
          {user ? "Edit User" : "Create User"}
        </h2>

        <button
          onClick={onClose}
          className="mt-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}