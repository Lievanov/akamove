"use client";
import { Chip } from "./Chip";

const customColors = {
  1: "#1a73e8",
  2: "#aa66cc",
  3: "#34a853",
  4: "#ea4335",
  5: "#ff6f61",
  6: "#33b5e5",
  7: "#aa66cc",
  8: "#ffbb33",
  9: "#99cc00",
  10: "#ff4444",
};

function ClassChips({ colorIds, classes, router, periodId, openInNewTab = false }) {
  if (colorIds?.length !== classes?.length) {
    console.error("The length of colorIds and classes arrays must match.");
    return null;
  }
  if (!colorIds[0]) {
    return <Chip label="Not Registered" />;
  }

  const buildClassesUrl = (className) =>
    periodId
      ? `/dashboard/classes?searchParam=${className}&periodId=${periodId}`
      : `/dashboard/classes?searchParam=${className}`;

  const openClass = (className) => {
    const url = buildClassesUrl(className);
    if (openInNewTab) {
      window.open(window.location.origin + url, "_blank");
      return;
    }
    router.push(url);
  };

  return (
    <div className="flex flex-col items-start gap-1">
      {classes.map((className, index) => {
        const id = parseInt(colorIds[index], 10);
        const chipColor = customColors[id] || "#ccc";
        return (
          <button
            key={`${className}-${colorIds[index]}-${index}`}
            type="button"
            onClick={() => openClass(className)}
            onContextMenu={(e) => {
              e.preventDefault();
              const url = buildClassesUrl(className);
              window.open(window.location.origin + url, "_blank");
            }}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
          >
            <Chip label={className} color={chipColor} />
          </button>
        );
      })}
    </div>
  );
}

export { ClassChips };
