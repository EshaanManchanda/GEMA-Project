import { cn } from '../../utils/cn';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Pagination">
      <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
        Previous
      </button>
      {start > 1 && <button onClick={() => onPageChange(1)} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50">1</button>}
      {start > 2 && <span className="px-2 text-gray-500">...</span>}
      {pages.map((p) => (
        <button key={p} onClick={() => onPageChange(p)} className={cn('px-3 py-1.5 text-sm rounded-md border', p === currentPage ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50')}>
          {p}
        </button>
      ))}
      {end < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
      {end < totalPages && <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50">{totalPages}</button>}
      <button disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
        Next
      </button>
    </nav>
  );
}
