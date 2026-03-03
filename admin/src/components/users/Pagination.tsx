interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ page, total, limit, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages: (number | "...")[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        Math.abs(i - page) <= 1
      ) {
        pages.push(i);
      } else if (
        i === page - 2 ||
        i === page + 2
      ) {
        pages.push("...");
      }
    }

    return [...new Set(pages)];
  };

  const pages = generatePages();

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {pages.map((p, index) =>
        p === "..." ? (
          <span key={index} className="px-2">
            ...
          </span>
        ) : (
          <button
            key={index}
            onClick={() => onPageChange(p)}
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