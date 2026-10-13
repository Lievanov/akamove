"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getLastestThreePeriods, getPeriodById } from "@/api/period/period";
import { Select } from "@/app/components/ui/Select";

// The period a page is showing: ?periodId=…, or the latest period.
// Resolves `period` to null once loaded when the studio has none yet.
export function useSelectedPeriod() {
  const searchParams = useSearchParams();
  const periodId = searchParams.get("periodId");
  const [periods, setPeriods] = useState(null);
  const [period, setPeriod] = useState(undefined);

  useEffect(() => {
    const load = async () => {
      const recent = (await getLastestThreePeriods()) ?? [];
      let selected = periodId ? recent.find((p) => p.id === periodId) : recent[0];
      // An older period opened from a link isn't in the recent list.
      if (periodId && !selected) {
        selected = await getPeriodById(periodId);
        if (selected) recent.push(selected);
      }
      setPeriods(recent);
      setPeriod(selected ?? recent[0] ?? null);
    };
    load();
  }, [periodId]);

  return { periods, period };
}

// Period dropdown that keeps the choice in the URL (?periodId=…).
export function PeriodPicker({ periods, period }) {
  const router = useRouter();
  const pathname = usePathname();
  if (!periods?.length) return null;
  return (
    <div className="w-full sm:w-56">
      <Select
        aria-label="Period"
        value={period?.id}
        onChange={(id) => router.replace(`${pathname}?periodId=${id}`, { scroll: false })}
        options={periods.map((p) => ({ value: p.id, label: p.name }))}
      />
    </div>
  );
}
