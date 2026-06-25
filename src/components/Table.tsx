import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface TableProps {
  headers: string[];
  loading?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  children: React.ReactNode;
  isEmpty?: boolean;
}

const Table: React.FC<TableProps> = ({
  headers,
  loading = false,
  totalItems = 0,
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange,
  children,
  isEmpty = false,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePrevPage = () => {
    if (onPageChange && currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (onPageChange && currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-foreground">
          <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="px-6 py-4 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {headers.map((_, hIdx) => (
                    <td key={hIdx} className="px-6 py-5">
                      <div className="h-4 bg-muted-foreground/10 rounded w-2/3"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 border border-border/50">
                      <Inbox className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">No records found</p>
                      <p className="text-xs mt-0.5">Try adjusting your filters or adding new items.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && !isEmpty && onPageChange && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border px-6 py-4 text-sm text-muted-foreground bg-muted/20 shrink-0">
          <div className="text-center sm:text-left">
            Showing <span className="font-semibold text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{' '}
            of <span className="font-semibold text-foreground">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="rounded-xl border border-border/60 p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-all duration-200"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                // Simple logic: display first page, last page, and pages around current
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => onPageChange(pageNumber)}
                      className={`h-9 w-9 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                        currentPage === pageNumber
                          ? 'bg-primary border-primary text-white shadow-glow-primary'
                          : 'border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === 2 ||
                  pageNumber === totalPages - 1
                ) {
                  return <span key={pageNumber} className="px-1.5 text-xs">...</span>;
                }
                return null;
              })}
            </div>

            <span className="sm:hidden text-xs font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-border/60 p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-all duration-200"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
