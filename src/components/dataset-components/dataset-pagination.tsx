'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatasetPaginationProps {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DatasetPagination({
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  className,
}: DatasetPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Don't show pagination if there's only one page or no items
  if (totalPages <= 1) {
    return null;
  }

  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className={cn('flex justify-center pt-3', className)}>
      <div className="flex items-center justify-center gap-2 flex-nowrap max-w-full overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="flex shrink-0 items-center gap-1 min-h-11 whitespace-nowrap transition-all duration-200 hover:scale-105"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {getVisiblePages().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`dots-${index}`} className="flex h-11 min-w-11 items-center justify-center px-2 text-sm text-gray-400 shrink-0">
                  ...
                </span>
              );
            }

            const pageNumber = page as number;
            const isCurrentPage = pageNumber === currentPage;

            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  'flex h-11 min-w-11 shrink-0 items-center justify-center px-2 text-sm rounded-md transition-all duration-200 hover:scale-105',
                  isCurrentPage
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="flex shrink-0 items-center gap-1 min-h-11 whitespace-nowrap transition-all duration-200 hover:scale-105"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
