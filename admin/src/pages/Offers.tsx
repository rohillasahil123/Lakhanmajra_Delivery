import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";

type OfferItem = {
  _id: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  image: string;
  linkUrl?: string;
  priority?: number;
  isActive?: boolean;
};

type FormState = {
  title: string;
  subtitle: string;
  cta: string;
  linkUrl: string;
  priority: string;
  isActive: boolean;
};

const initialForm: FormState = {
  title: "",
  subtitle: "",
  cta: "",
  linkUrl: "",
  priority: "0",
  isActive: true,
};

export default function Offers() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const title = useMemo(() => (editingId ? "Edit Offer Slide" : "Add Offer Slide"), [editingId]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/offers/admin");
      const payload = res.data?.data ?? res.data ?? [];
      setOffers(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers().catch(() => {});
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setSelectedFile(null);
    setPreviewUrl("");
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (offer: OfferItem) => {
    setEditingId(offer._id);
    setForm({
      title: offer.title || "",
      subtitle: offer.subtitle || "",
      cta: offer.cta || "",
      linkUrl: offer.linkUrl || "",
      priority: String(offer.priority ?? 0),
      isActive: offer.isActive !== false,
    });
    setSelectedFile(null);
    setPreviewUrl(offer.image || "");
    if (fileRef.current) fileRef.current.value = "";
    setError(null);
  };

  const toFormData = () => {
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("subtitle", form.subtitle);
    fd.append("cta", form.cta);
    fd.append("linkUrl", form.linkUrl);
    fd.append("priority", form.priority || "0");
    fd.append("isActive", String(form.isActive));
    if (selectedFile) {
      fd.append("image", selectedFile);
    }
    return fd;
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!editingId && !selectedFile) {
        setError("Image is required for new offer");
        return;
      }

      if (editingId) {
        await api.patch(`/offers/admin/${editingId}`, toFormData(), {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/offers/admin", toFormData(), {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      resetForm();
      await loadOffers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = globalThis.confirm("Delete this offer slide?");
    if (!ok) return;

    try {
      setError(null);
      await api.delete(`/offers/admin/${id}`);
      if (editingId === id) resetForm();
      await loadOffers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Delete failed");
    }
  };

  let submitLabel = "Create Slide";
  if (saving) {
    submitLabel = "Saving...";
  } else if (editingId) {
    submitLabel = "Update Slide";
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);

    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    if (!editingId) {
      setPreviewUrl('');
    }
  };

  let listContent: React.ReactNode = (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {offers.map((offer) => (
        <div key={offer._id} className="border rounded-xl p-3 space-y-2">
          <img
            src={offer.image}
            alt={offer.title || "Offer"}
            className="w-full h-32 object-cover rounded-lg border border-slate-200"
          />
          <div>
            <div className="font-semibold text-slate-800">{offer.title || "(No title)"}</div>
            <div className="text-xs text-slate-500">{offer.subtitle || "No subtitle"}</div>
          </div>
          <div className="text-xs text-slate-500">
            Priority: {offer.priority ?? 0} · {offer.isActive === false ? "Inactive" : "Active"}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startEdit(offer)}
              className="px-3 py-1.5 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(offer._id)}
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
    listContent = <div className="text-sm text-slate-500">Loading...</div>;
  } else if (offers.length === 0) {
    listContent = <div className="text-sm text-slate-500">No offer slides yet.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Offer Slides</h2>
        <p className="text-sm text-slate-500">Home page ka "Offers For You" slider yahan se manage karein.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            {error}
          </div>
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
            placeholder="Subtitle"
            value={form.subtitle}
            onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="CTA (e.g. Shop Now)"
            value={form.cta}
            onChange={(e) => setForm((prev) => ({ ...prev, cta: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Link URL (optional)"
            value={form.linkUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Priority"
            value={form.priority}
            onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <span>Active</span>
          </label>
        </div>

        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          {previewUrl && (
            <img src={previewUrl} alt="Offer preview" className="w-full max-w-xl h-40 object-cover rounded-lg border border-slate-200" />
          )}
        </div>

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
          <h3 className="text-lg font-semibold text-slate-800">Current Slides</h3>
          <button
            type="button"
            onClick={() => loadOffers().catch(() => {})}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>

        {listContent}
      </div>
    </div>
  );
}
