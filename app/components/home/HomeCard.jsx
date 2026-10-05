"use client";
import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/app/components/ui/utils/cn";

// Shell for each block on the dashboard home: a titled white card with an
// optional "View all" style link in the header.
function HomeCard({ title, subtitle, href, linkLabel = "View all", className, children }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn("rounded-lg border border-brand-dark/10 bg-white", className)}
    >
      <header className="flex items-start justify-between gap-3 border-b border-brand-dark/10 px-5 py-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-brand-dark">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-brand-dark/60">{subtitle}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-medium text-brand-pink-deep hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
          >
            {linkLabel}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

// Quiet one-liner for a card with nothing to show.
function CardEmpty({ children, action }) {
  return (
    <div className="py-4 text-center">
      <p className="text-sm text-brand-dark/60">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function CardError({ onRetry }) {
  return (
    <p className="py-4 text-center text-sm text-danger">
      Couldn&apos;t load this.{" "}
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
      >
        Try again
      </button>
    </p>
  );
}

function CardRowsSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 py-1" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-16 rounded bg-brand-dark/[0.07] motion-safe:animate-pulse" />
          <div className="h-4 flex-1 rounded bg-brand-dark/[0.07] motion-safe:animate-pulse" />
          <div className="h-4 w-12 rounded bg-brand-dark/[0.07] motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// Loads one card's data. `load` resolving to undefined counts as an error
// (the data-access helpers return undefined when a query fails).
function useCardData(load, deps = []) {
  const [state, setState] = useState({ status: "loading", data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, status: "loading" }));
    Promise.resolve(load())
      .then((data) => {
        if (!active) return;
        setState(
          data === undefined
            ? { status: "error", data: null }
            : { status: "ready", data }
        );
      })
      .catch(() => active && setState({ status: "error", data: null }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

export { HomeCard, CardEmpty, CardError, CardRowsSkeleton, useCardData };
