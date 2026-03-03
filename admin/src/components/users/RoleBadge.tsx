export default function RoleBadge({
  name,
}: Readonly<{
  name?: string;
}>) {
  if (!name) {
    return (
      <span className="text-slate-400 text-xs">
        —
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
      {name}
    </span>
  );
}