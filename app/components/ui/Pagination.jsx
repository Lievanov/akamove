"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "./IconButton";

function Pagination({ page, totalItems, pageSize, onChange }) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));

  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      <IconButton
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </IconButton>
      <span className="text-sm text-brand-dark/70">
        Page {page} of {pageCount}
      </span>
      <IconButton
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

export { Pagination };
