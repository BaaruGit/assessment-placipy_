import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const createPageRange = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (start === 1) {
      end = Math.min(totalPages, start + maxVisible - 1);
    } else if (end === totalPages) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push('start-ellipsis');
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push('end-ellipsis');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = createPageRange();

  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages;

  return (
    <nav
      className="student-pagination"
      aria-label="Pagination navigation"
    >
      <button
        type="button"
        className="pagination-button pagination-prev-next"
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={isPrevDisabled}
        aria-label="Previous page"
      >
        Prev
      </button>

      <div className="pagination-pages">
        {pages.map((page, index) => {
          if (typeof page === 'string') {
            return (
              <span
                key={page + index}
                className="pagination-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <button
              key={page}
              type="button"
              className={`pagination-button pagination-page${
                isActive ? ' active' : ''
              }`}
              onClick={() => handlePageClick(page)}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="pagination-button pagination-prev-next"
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={isNextDisabled}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
};

export default Pagination;

