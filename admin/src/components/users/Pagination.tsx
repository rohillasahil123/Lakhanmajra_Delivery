import { LIMIT } from "../../hooks/useUsers";

export default function Pagination({
  page,
  total,
  onChange,
}: Readonly<{
  page: number;
  total: number;
  onChange: (p: number) => void;
}>) {
  const totalPages = Math.max(
    1,
    Math.ceil(total / LIMIT)
  );

  return (
    <div className="flex gap-2">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </button>

      <span>
        {page} / {totalPages}
      </span>

      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}