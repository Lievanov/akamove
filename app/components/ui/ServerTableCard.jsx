"use client";
import { Search } from "lucide-react";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Input } from "./Input";
import { Pagination } from "./Pagination";
import { cn } from "./utils/cn";

// The card around every roster table: search box + result count, the
// error and "no matches" states, a dimmed table while the next page
// loads, and pagination. `table` comes from useServerTable.
function ServerTableCard({
  table,
  noun = ["item", "items"],
  searchLabel,
  searchPlaceholder,
  noMatchesHint,
  searchTour,
  toolbar,
  children,
}) {
  const [one, many] = noun;
  const showSearch = !!searchPlaceholder;

  return (
    <div className="rounded-lg border border-brand-dark/10 bg-white p-2">
      <div className="mb-2 flex flex-wrap items-center gap-3 p-2">
        {showSearch && (
          <div className="relative min-w-[12rem] flex-1" data-tour={searchTour}>
            <label htmlFor={`${many}-search`} className="sr-only">
              {searchLabel ?? `Search ${many}`}
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/40"
              aria-hidden="true"
            />
            <Input
              id={`${many}-search`}
              type="search"
              className="pl-9"
              placeholder={searchPlaceholder}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
          </div>
        )}
        {toolbar}
        <p
          className={cn("text-sm text-brand-dark/70", !showSearch && "mr-auto")}
          aria-live="polite"
        >
          {table.total} {table.total === 1 ? one : many}
        </p>
      </div>

      {table.isError ? (
        <Alert severity="error" className="m-2">
          Couldn&apos;t load {many}. Check your connection and{" "}
          <button
            type="button"
            className="rounded font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
            onClick={table.refresh}
          >
            try again
          </button>
          .
        </Alert>
      ) : table.noMatches ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-semibold text-brand-dark">
            No {many} match “{table.search}”
          </p>
          {noMatchesHint && (
            <p className="mt-1 text-sm text-brand-dark/60">{noMatchesHint}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => table.setSearch("")}
          >
            Clear search
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "transition-opacity",
            table.isRefreshing && "opacity-60"
          )}
          aria-busy={table.isRefreshing}
        >
          {children}
        </div>
      )}

      <div className="mt-4 pb-2">
        <Pagination
          page={table.page}
          totalItems={table.total}
          pageSize={table.pageSize}
          onChange={table.setPage}
        />
      </div>
    </div>
  );
}

// Shared link styles for table cells.
const rowLinkClass =
  "rounded font-medium text-brand-dark hover:text-brand-pink-deep hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink";

export { ServerTableCard, rowLinkClass };
