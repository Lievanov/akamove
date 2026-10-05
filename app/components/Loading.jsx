// Placeholder shown while a page or section loads. Shaped like what's
// coming, so the layout doesn't jump when data arrives.
// variant: "page" (header + table, default), "form-page" (header + form),
// "table", "form", "block".

function Bar({ className = "" }) {
  return (
    <div
      className={`rounded bg-brand-dark/[0.07] motion-safe:animate-pulse ${className}`}
    />
  );
}

function TableRows({ rows = 6 }) {
  return (
    <div className="rounded-lg border border-brand-dark/10 bg-white p-4">
      <Bar className="mb-5 h-9 w-full" />
      <div className="space-y-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-6">
            <Bar className="h-4 w-1/5" />
            <Bar className="h-4 w-1/5" />
            <Bar className="h-4 w-1/4" />
            <Bar className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormFields({ fields = 5 }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-lg border border-brand-dark/10 bg-white p-6">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-9 w-full" />
        </div>
      ))}
      <Bar className="ml-auto h-10 w-32" />
    </div>
  );
}

function Loading({ variant = "page" }) {
  let content;
  if (variant === "table") content = <TableRows />;
  else if (variant === "form-page")
    content = (
      <>
        <div className="border-b border-brand-dark/10 bg-white px-6 py-4">
          <Bar className="h-5 w-48" />
        </div>
        <div className="px-4 py-6">
          <FormFields />
        </div>
      </>
    );
  else if (variant === "form") content = <FormFields />;
  else if (variant === "block")
    content = (
      <div className="space-y-3">
        <Bar className="h-4 w-2/3" />
        <Bar className="h-4 w-1/2" />
        <Bar className="h-4 w-3/5" />
      </div>
    );
  else
    content = (
      <>
        <div className="border-b border-brand-dark/10 bg-white px-6 py-4">
          <Bar className="h-5 w-40" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Bar className="mb-6 h-10 w-40" />
          <TableRows />
        </div>
      </>
    );

  return (
    <div role="status" aria-live="polite" className="skeleton-delay">
      <span className="sr-only">Loading…</span>
      {content}
    </div>
  );
}

export default Loading;
