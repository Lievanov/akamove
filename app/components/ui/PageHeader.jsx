import Link from "next/link";
import { ChevronRight } from "lucide-react";
import HelpMenu from "@/app/components/onboarding/HelpMenu";

// Top bar of every dashboard page.
// - `breadcrumbs`: [{ label, href }] for the parent pages, shown above the
//   title on detail/edit pages (e.g. Students › Ana Pérez).
// - `actions`: the page's primary controls (e.g. an "Add student" button),
//   so every page puts them in the same place.
function PageHeader({ title, breadcrumbs, actions }) {
  return (
    <header className="relative border-b border-brand-dark/10 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          {breadcrumbs?.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1 text-xs text-brand-dark/60">
                {breadcrumbs.map((crumb) => (
                  <li key={crumb.href} className="flex items-center gap-1">
                    <Link
                      href={crumb.href}
                      className="rounded hover:text-brand-pink-deep hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
                    >
                      {crumb.label}
                    </Link>
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="truncate text-lg font-semibold text-brand-dark">
            {title}
          </h1>
        </div>
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          {actions}
          <HelpMenu />
        </div>
      </div>
    </header>
  );
}

export { PageHeader };
