interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ page, total, limit, onPageChange }: PaginationProps) => {

  const generatePages = () => {
    const pages: (number | string)[] = [];

    const totalPages = Math.ceil(total / limit);

    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return [...new Set(pages)];
  };

  const pages = generatePages();

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {pages.map((p) =>
        p === "..." ? (
          <span key={`ellipsis-${p}`} className="px-2">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(Number(p))}
            className={`px-3 py-1 rounded-md text-sm ${
              p === page
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {p}
          </button>
        )
      )}
    </div>
  );
};

export default Pagination;