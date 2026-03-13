import { useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../api/client";

type UserRow = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  roleId?: { name?: string } | string;
};

type NotificationRow = {
  _id: string;
  title: string;
  body: string;
  audience: "all" | "selected";
  recipients?: Array<{ _id: string; name?: string; email?: string; phone?: string } | string>;
  isActive: boolean;
  linkUrl?: string;
  imageUrl?: string;
  createdAt?: string;
};

type FormState = {
  title: string;
  body: string;
  linkUrl: string;
  imageUrl: string;
  audience: "all" | "selected";
};

const initialForm: FormState = {
  title: "",
  body: "",
  linkUrl: "",
  imageUrl: "",
  audience: "all",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const roleName = typeof u.roleId === "string" ? "" : u.roleId?.name || "";
      return [u.name, u.email, u.phone, roleName].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [users, userSearch]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications/admin?limit=100");
      const payload = res.data?.data?.data ?? res.data?.data ?? [];
      setNotifications(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users?limit=200");
      const payload = res.data?.data?.users ?? [];
      setUsers(Array.isArray(payload) ? payload : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadNotifications().catch(() => {});
    loadUsers().catch(() => {});
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setSelectedUserIds([]);
    setEditingId(null);
    setUserSearch("");
    setSelectedImage(null);
    setImagePreviewUrl("");
  };

  const toggleRecipient = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const startEdit = (row: NotificationRow) => {
    setEditingId(row._id);
    setForm({
      title: row.title || "",
      body: row.body || "",
      linkUrl: row.linkUrl || "",
      imageUrl: row.imageUrl || "",
      audience: row.audience || "all",
    });
    setSelectedUserIds(
      (row.recipients || []).map((r) => (typeof r === 'string' ? r : r._id)).filter(Boolean)
    );
    setSelectedImage(null);
    setImagePreviewUrl(row.imageUrl || "");
    setError(null);
  };

  const onImageChange = (file: File | null) => {
    setSelectedImage(file);
    if (!file) {
      setImagePreviewUrl(form.imageUrl || "");
      return;
    }

    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!form.title.trim()) {
        setError("Title is required");
        return;
      }
      if (!form.body.trim()) {
        setError("Message body is required");
        return;
      }
      if (form.audience === "selected" && selectedUserIds.length === 0) {
        setError("Select at least one user for targeted notification");
        return;
      }

      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("body", form.body.trim());
      payload.append("linkUrl", form.linkUrl.trim());
      payload.append("imageUrl", form.imageUrl.trim());
      payload.append("audience", form.audience);
      payload.append(
        "recipientIds",
        JSON.stringify(form.audience === "selected" ? selectedUserIds : [])
      );
      if (selectedImage) {
        payload.append("image", selectedImage);
      }

      if (editingId) {
        await api.patch(`/notifications/admin/${editingId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/notifications/admin", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      resetForm();
      await loadNotifications();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: NotificationRow) => {
    try {
      await api.patch(`/notifications/admin/${row._id}`, { isActive: !row.isActive });
      await loadNotifications();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Status update failed");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = globalThis.confirm("Delete this notification?");
    if (!ok) return;

    try {
      await api.delete(`/notifications/admin/${id}`);
      if (editingId === id) resetForm();
      await loadNotifications();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Delete failed");
    }
  };

  let submitLabel = "Send Notification";
  if (editingId) submitLabel = "Update Notification";
  if (saving) submitLabel = "Saving...";

  let notificationListContent: ReactNode = (
    <div className="space-y-3">
      {notifications.map((row) => (
        <div key={row._id} className="border rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-800">{row.title}</div>
              <div className="text-sm text-slate-600">{row.body}</div>
              {row.imageUrl?.trim() ? (
                <img
                  src={row.imageUrl}
                  alt="Notification"
                  className="mt-2 h-24 w-full max-w-xs object-cover rounded-lg border border-slate-200"
                />
              ) : null}
              <div className="text-xs text-slate-500 mt-1">
                Audience: {row.audience === "all" ? "All users" : `Selected users (${row.recipients?.length || 0})`}
                {row.createdAt ? ` · ${new Date(row.createdAt).toLocaleString()}` : ""}
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs ${
                row.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {row.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {row.audience === "selected" && (row.recipients?.length || 0) > 0 && (
            <div className="text-xs text-slate-600">
              Recipients: {(row.recipients || [])
                .slice(0, 4)
                .map((r) => (typeof r === 'string' ? r.slice(-6) : r.name || r.phone || 'User'))
                .join(', ')}
              {(row.recipients?.length || 0) > 4 ? " ..." : ""}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startEdit(row)}
              className="px-3 py-1.5 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => toggleActive(row)}
              className="px-3 py-1.5 text-xs rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              {row.isActive ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row._id)}
              className="px-3 py-1.5 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    notificationListContent = <div className="text-sm text-slate-500">Loading...</div>;
  } else if (notifications.length === 0) {
    notificationListContent = <div className="text-sm text-slate-500">No notifications yet.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Notifications</h2>
        <p className="text-sm text-slate-500">
          Broadcast to all users or target selected users. Users will see these in app notification screen.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">{editingId ? "Edit Notification" : "Send Notification"}</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Link URL (optional)"
            value={form.linkUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
          />
          <textarea
            className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
            placeholder="Notification message"
            rows={3}
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onImageChange(e.target.files?.[0] || null)}
          />
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Notification preview"
              className="h-28 w-full max-w-sm object-cover rounded-lg border border-slate-200"
            />
          ) : null}
          <p className="text-xs text-slate-500">Tip: URL optional hai, aap direct file bhi upload kar sakte ho.</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="audience"
              checked={form.audience === "all"}
              onChange={() => setForm((prev) => ({ ...prev, audience: "all" }))}
            />
            <span>All users</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="audience"
              checked={form.audience === "selected"}
              onChange={() => setForm((prev) => ({ ...prev, audience: "selected" }))}
            />
            <span>Selected users</span>
          </label>
        </div>

        {form.audience === "selected" && (
          <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
            <div className="flex items-center justify-between gap-2">
              <input
                className="border rounded-lg px-3 py-2 text-sm flex-1"
                placeholder="Search user by name/email/phone"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <span className="text-xs text-slate-500">Selected: {selectedUserIds.length}</span>
            </div>
            <div className="max-h-44 overflow-auto space-y-1">
              {filteredUsers.length === 0 ? (
                <div className="text-sm text-slate-500">No users found.</div>
              ) : (
                filteredUsers.map((user) => {
                  const checked = selectedUserIds.includes(user._id);
                  return (
                    <label key={user._id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-white">
                      <input type="checkbox" checked={checked} onChange={() => toggleRecipient(user._id)} />
                      <span className="font-medium text-slate-800">{user.name || "User"}</span>
                      <span className="text-slate-500">{user.phone || user.email || ""}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {submitLabel}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800">Sent Notifications</h3>
          <button
            type="button"
            onClick={() => loadNotifications().catch(() => {})}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>

        {notificationListContent}
      </div>
    </div>
  );
}
