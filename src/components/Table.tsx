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

  return (
    <div className="w-full rounded-lg border border-border bg-card overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-foreground">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {headers.map((header, i) => (
                <th key={i} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {headers.map((_, hIdx) => (
                    <td key={hIdx} className="px-4 py-3.5">
                      <div className="h-3.5 bg-muted-foreground/10 rounded w-2/3" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-[12px] font-medium text-foreground">No records found</p>
                    <p className="text-[11px]">Try adjusting your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>

      {!loading && !isEmpty && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 bg-muted/10">
          <span className="text-[11px] text-muted-foreground">
            {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`h-7 w-7 rounded-md text-[11px] font-semibold border transition-colors ${
                      currentPage === page
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (page === 2 || page === totalPages - 1) {
                return <span key={page} className="px-1 text-[11px] text-muted-foreground">…</span>;
              }
              return null;
            })}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
