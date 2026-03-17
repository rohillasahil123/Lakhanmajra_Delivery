import { useCallback } from 'react';
import { UserIcons } from './UserIcons';

interface UserPaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination component for user table
 */
export function UserPagination({
  page,
  total,
  limit,
  onPageChange,
}: Readonly<UserPaginationProps>) {
  const totalPages = Math.ceil(total / limit);

  const handlePrev = useCallback(() => {
    if (page > 1) onPageChange(page - 1);
  }, [page, onPageChange]);

  const handleNext = useCallback(() => {
    if (page < totalPages) onPageChange(page + 1);
  }, [page, totalPages, onPageChange]);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={handlePrev}
        disabled={page === 1}
        style={{
          minWidth: 28,
          height: 28,
          padding: '0 7px',
          borderRadius: 7,
          border: '1px solid #e8eaf0',
          background: '#fff',
          color: '#4b5470',
          cursor: page === 1 ? 'default' : 'pointer',
          fontSize: 12.5,
          fontWeight: 600,
          opacity: page === 1 ? 0.35 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.12s',
        }}
      >
        <UserIcons.ChevLeft />
      </button>

      {pageNumbers.map((n) => (
        <button
          key={n}
          onClick={() => onPageChange(n)}
          style={{
            minWidth: 28,
            height: 28,
            padding: '0 7px',
            borderRadius: 7,
            border: `1px solid ${n === page ? '#3b6ef8' : '#e8eaf0'}`,
            background: n === page ? '#3b6ef8' : '#fff',
            color: n === page ? '#fff' : '#4b5470',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.12s',
            boxShadow: n === page ? '0 2px 8px rgba(59,110,248,0.25)' : 'none',
          }}
        >
          {n}
        </button>
      ))}

      <button
        onClick={handleNext}
        disabled={page === totalPages}
        style={{
          minWidth: 28,
          height: 28,
          padding: '0 7px',
          borderRadius: 7,
          border: '1px solid #e8eaf0',
          background: '#fff',
          color: '#4b5470',
          cursor: page === totalPages ? 'default' : 'pointer',
          fontSize: 12.5,
          fontWeight: 600,
          opacity: page === totalPages ? 0.35 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.12s',
        }}
      >
        <UserIcons.ChevRight />
      </button>
    </div>
  );
}
