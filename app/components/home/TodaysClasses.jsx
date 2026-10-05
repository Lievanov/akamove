"use client";
import Link from "next/link";
import { getTodaysClasses } from "@/api/dashboard/today";
import { useSelectedLocation } from "@/app/context/LocationContext";
import { buttonVariants } from "@/app/components/ui/Button";
import { categoryDotFor } from "@/app/components/ui/ClassChips";
import { formatDate, formatTime } from "@/app/components/utils/utils";
import { cn } from "@/app/components/ui/utils/cn";
import {
  HomeCard,
  CardEmpty,
  CardError,
  CardRowsSkeleton,
  useCardData,
} from "./HomeCard";

function ClassRow({ item, periodId }) {
  const params = new URLSearchParams({ searchParam: item.label });
  if (periodId) params.set("periodId", periodId);
  return (
    <li className="flex items-center gap-4 py-2.5">
      <span className="w-20 shrink-0 text-sm font-medium tabular-nums text-brand-dark">
        {formatTime(item.time)}
      </span>
      <Link
        href={`/dashboard/classes?${params.toString()}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded text-sm text-brand-dark hover:text-brand-pink-deep hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
      >
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            categoryDotFor(item.classType)
          )}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </Link>
      <span className="shrink-0 text-sm tabular-nums text-brand-dark/70">
        {item.enrolled} enrolled
      </span>
    </li>
  );
}

// Today's classes at the location picked in the sidebar — or at every
// location, grouped, when none is picked.
function TodaysClasses({ today, current, locations, isAdmin }) {
  const { selectedLocation } = useSelectedLocation();
  const period = current?.period;
  const { status, data, retry } = useCardData(
    () =>
      period && current.isRunning
        ? getTodaysClasses(period.id, today.weekday)
        : Promise.resolve([]),
    [period?.id, current?.isRunning, today.weekday]
  );

  const classes = (data ?? []).filter(
    (c) => !selectedLocation || c.locationId === selectedLocation.id
  );
  const where = selectedLocation ? ` at ${selectedLocation.name}` : "";
  const subtitle = period
    ? `${today.weekday}${where} · ${period.name}`
    : `${today.weekday}${where}`;

  let body;
  if (!period) {
    body = (
      <CardEmpty
        action={
          isAdmin && (
            <Link
              href="/dashboard/periods/new"
              className={buttonVariants({ size: "sm" })}
            >
              Add your first period
            </Link>
          )
        }
      >
        No classes are scheduled yet. Classes show up here once a period has
        a weekly schedule.
      </CardEmpty>
    );
  } else if (!current.isRunning) {
    body = (
      <CardEmpty
        action={
          isAdmin && (
            <Link
              href="/dashboard/periods/new"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Add the next period
            </Link>
          )
        }
      >
        No period is running today. {period.name} ran{" "}
        {formatDate(period.start_date)} – {formatDate(period.end_date)}.
      </CardEmpty>
    );
  } else if (status === "loading") {
    body = <CardRowsSkeleton rows={4} />;
  } else if (status === "error") {
    body = <CardError onRetry={retry} />;
  } else if (classes.length === 0) {
    body = <CardEmpty>No classes on {today.weekday}s{where}.</CardEmpty>;
  } else if (selectedLocation || locations.length <= 1) {
    body = (
      <ul className="-my-2.5 divide-y divide-brand-dark/5">
        {classes.map((item) => (
          <ClassRow key={item.id} item={item} periodId={period.id} />
        ))}
      </ul>
    );
  } else {
    const groups = locations
      .map((loc) => ({
        loc,
        items: classes.filter((c) => c.locationId === loc.id),
      }))
      .filter((g) => g.items.length > 0);
    body = (
      <div className="space-y-4">
        {groups.map(({ loc, items }) => (
          <div key={loc.id}>
            <h3 className="mb-1 text-xs font-semibold text-brand-dark/60">
              {loc.name}
            </h3>
            <ul className="divide-y divide-brand-dark/5">
              {items.map((item) => (
                <ClassRow key={item.id} item={item} periodId={period.id} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <HomeCard
      title="Today's classes"
      subtitle={subtitle}
      href={isAdmin && period ? `/dashboard/periods/${period.id}/report` : "/dashboard/classes"}
      linkLabel={isAdmin && period ? "Period report" : "All classes"}
    >
      {body}
    </HomeCard>
  );
}

export default TodaysClasses;
