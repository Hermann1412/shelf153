import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pages = getPages();

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-muted-foreground text-sm">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              currentPage === page
                ? "gradient-primary text-primary-foreground"
                : "bg-secondary text-foreground hover:bg-primary/20"
            }`}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
