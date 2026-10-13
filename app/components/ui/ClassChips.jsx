"use client";
import Link from "next/link";
import { Chip } from "./Chip";

// Categorical palette (tailwind `category.*`): soft fill + dark ink, all
// AA-contrast. Written out in full so Tailwind keeps the classes.
const CATEGORY_CLASSES = [
  "bg-category-rose-soft text-category-rose",
  "bg-category-indigo-soft text-category-indigo",
  "bg-category-teal-soft text-category-teal",
  "bg-category-ochre-soft text-category-ochre",
  "bg-category-plum-soft text-category-plum",
  "bg-category-olive-soft text-category-olive",
  "bg-category-clay-soft text-category-clay",
  "bg-category-slate-soft text-category-slate",
];

// Solid ink of the same palette, for small markers (e.g. a legend dot).
const CATEGORY_DOT_CLASSES = [
  "bg-category-rose",
  "bg-category-indigo",
  "bg-category-teal",
  "bg-category-ochre",
  "bg-category-plum",
  "bg-category-olive",
  "bg-category-clay",
  "bg-category-slate",
];

// Same class type → same color on every page and every visit.
const categoryIndexFor = (classTypeId) => {
  const key = String(classTypeId ?? "");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % CATEGORY_CLASSES.length;
};

const categoryClassFor = (classTypeId) =>
  CATEGORY_CLASSES[categoryIndexFor(classTypeId)];

const categoryDotFor = (classTypeId) =>
  CATEGORY_DOT_CLASSES[categoryIndexFor(classTypeId)];

// `router` is still accepted for older callers but no longer needed —
// chips are plain links now (cmd-click / middle-click open a new tab).
// eslint-disable-next-line no-unused-vars
function ClassChips({ colorIds, classes, router, periodId, openInNewTab = false }) {
  if (colorIds?.length !== classes?.length) {
    console.error("The length of colorIds and classes arrays must match.");
    return null;
  }
  if (!colorIds[0]) {
    return <Chip label="Not registered" tone="neutral" />;
  }

  // Payments → Enrollments, filtered to everyone in this class.
  const buildClassesUrl = (className) => {
    const params = new URLSearchParams({ tab: "enrollments", searchParam: className });
    if (periodId) params.set("periodId", periodId);
    return `/dashboard/payments?${params.toString()}`;
  };

  return (
    <div className="flex flex-col items-start gap-1">
      {classes.map((className, index) => (
        <Link
          key={`${className}-${colorIds[index]}-${index}`}
          href={buildClassesUrl(className)}
          {...(openInNewTab && { target: "_blank", rel: "noopener" })}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
        >
          <Chip
            label={className}
            tone={null}
            className={`${categoryClassFor(colorIds[index])} hover:brightness-95`}
          />
        </Link>
      ))}
    </div>
  );
}

export { ClassChips, categoryClassFor, categoryDotFor };
