import { useState, useEffect } from "react";
import { IUser } from "../../hooks/useUsers";

interface Role {
  _id: string;
  name: string;
}

interface UserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  roleId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserForm) => Promise<void>;
  roles: Role[];
  editingUser: IUser | null;
}

export default function UserModal({
  open,
  onClose,
  onSubmit,
  roles,
  editingUser,
}: Readonly<Props>)  {
  const [form, setForm] = useState<UserForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
  });

  const isEditMode = Boolean(editingUser);

  useEffect(() => {
    if (editingUser) {
      setForm({
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        password: "",
        roleId: editingUser.roleId?._id ?? "",
      });
    }
  }, [editingUser]);

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || (!isEditMode && !form.password)) {
      alert("Please fill all required fields");
      return;
    }

    await onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {isEditMode ? "Edit User" : "Create User"}
        </h2>

        <div className="space-y-3">
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} className="w-full border px-3 py-2 rounded" />

          {!isEditMode && (
            <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="w-full border px-3 py-2 rounded" />
          )}

          <select name="roleId" value={form.roleId} onChange={handleChange} className="w-full border px-3 py-2 rounded">
            <option value="">Select Role</option>
            {roles.map((role) => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
            Cancel
          </button>

          <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded">
            {isEditMode ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}