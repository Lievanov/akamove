"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 300;

// Paginated, searchable list backed by a server query — the one pattern
// behind every roster table (students, payments, private lessons, …).
//
// fetchPage({ from, to, search }) must resolve to { rows, count }; the
// data-access helpers return undefined on failure, which shows as an
// error state rather than an empty table.
//
// - Search and page live in the URL (?search=…&page=…), so Back, reload
//   and shared links land on the same view. Pass syncUrl: false when a
//   page shows more than one table. Pages using this hook must
//   sit inside a <Suspense> boundary (useSearchParams requires it).
// - Typing updates the input immediately; the query waits for a pause.
// - Previous rows stay on screen while the next page loads, and a slow
//   response can never overwrite a newer one.
export function useServerTable({
  fetchPage,
  pageSize = 10,
  deps = [],
  syncUrl: urlSync = true,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = urlSync ? searchParams.get("search") ?? "" : "";
  const initialPage = urlSync
    ? Math.max(1, parseInt(searchParams.get("page"), 10) || 1)
    : 1;

  const [search, setSearchInput] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [page, setPageState] = useState(initialPage);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const requestId = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const syncUrl = useCallback(
    (nextSearch, nextPage) => {
      if (!urlSync) return;
      const params = new URLSearchParams(window.location.search);
      // One-shot flash messages (?text=…&severity=…) shouldn't follow the
      // user around once they start paging or searching.
      params.delete("text");
      params.delete("severity");
      if (nextSearch.trim()) params.set("search", nextSearch);
      else params.delete("search");
      if (nextPage > 1) params.set("page", String(nextPage));
      else params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, urlSync]
  );

  // Debounce the typed search into the query that's actually sent.
  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => {
      setQuery(search);
      setPageState(1);
      syncUrl(search, 1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, query, syncUrl]);

  useEffect(() => {
    const id = ++requestId.current;
    setIsRefreshing(true);
    const from = (page - 1) * pageSize;
    fetchRef
      .current({ from, to: from + pageSize - 1, search: query.trim() })
      .then((result) => {
        if (id !== requestId.current) return;
        if (!result || result.rows === undefined) {
          setStatus("error");
        } else {
          setRows(result.rows ?? []);
          setTotal(result.count ?? 0);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (id === requestId.current) setStatus("error");
      })
      .finally(() => {
        if (id === requestId.current) setIsRefreshing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, pageSize, refreshKey, ...deps]);

  // Records were removed elsewhere and this page no longer exists — step
  // back to the last page that does.
  useEffect(() => {
    if (status !== "ready" || rows.length > 0 || total === 0 || page === 1) return;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > lastPage) {
      setPageState(lastPage);
      syncUrl(query, lastPage);
    }
  }, [status, rows.length, total, page, pageSize, query, syncUrl]);

  const setPage = (nextPage) => {
    setPageState(nextPage);
    syncUrl(query, nextPage);
  };

  const hasQuery = query.trim() !== "";

  return {
    rows,
    total,
    page,
    pageSize,
    setPage,
    search,
    setSearch: setSearchInput,
    status,
    isLoading: status === "loading",
    isRefreshing,
    isError: status === "error",
    // Nothing exists yet vs. nothing matches the current search.
    isEmpty: status === "ready" && total === 0 && !hasQuery,
    noMatches: status === "ready" && total === 0 && hasQuery,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
