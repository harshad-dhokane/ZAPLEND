'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-6 md:mt-8">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 font-black text-sm transition-all"
        style={{
          background: currentPage === 1 ? '#e5e5e5' : '#fff',
          border: '2px solid #000',
          boxShadow: currentPage === 1 ? 'none' : '2px 2px 0px #000',
          opacity: currentPage === 1 ? 0.5 : 1,
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page numbers */}
      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-1 sm:px-2 text-sm font-black text-black select-none">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-black uppercase transition-all"
            style={{
              background: currentPage === page ? '#000' : '#fff',
              color: currentPage === page ? '#fff' : '#000',
              border: '2px solid #000',
              boxShadow: currentPage === page ? '0px 0px 0px #000' : '2px 2px 0px #000',
              transform: currentPage === page ? 'translate(2px, 2px)' : 'none',
            }}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 font-black text-sm transition-all"
        style={{
          background: currentPage === totalPages ? '#e5e5e5' : 'var(--accent-primary)',
          border: '2px solid #000',
          boxShadow: currentPage === totalPages ? 'none' : '2px 2px 0px #000',
          opacity: currentPage === totalPages ? 0.5 : 1,
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
