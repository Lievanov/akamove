"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/components/ui/utils/cn";

const TABS = [
  { label: "General", href: "/dashboard/settings" },
  { label: "Membership", href: "/dashboard/settings/membership" },
];

// Sub-navigation under the Settings header. Each tab is its own route, so
// tabs can be linked to and Back works.
function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings sections"
      className="border-b border-brand-dark/10 bg-white px-4 sm:px-6"
    >
      <ul className="-mb-px flex gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center border-b-2 px-3 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink touch:py-3",
                  active
                    ? "border-brand-pink text-brand-dark"
                    : "border-transparent text-brand-dark/60 hover:text-brand-dark"
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SettingsTabs;
