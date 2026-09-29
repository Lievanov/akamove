import { useState, useEffect } from "react";
import { getPeriodRevenueSummary } from "@/api/period/period";
import { cn } from "@/app/components/ui/utils/cn";

const SummaryRow = ({ label, amount, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-brand-dark/5",
      selected && "bg-brand-pink/10"
    )}
  >
    <span className="text-sm text-brand-dark">{label}</span>
    <span className="text-sm text-brand-dark">${amount.toFixed(2)}</span>
  </button>
);

const PeriodRevenueSummary = ({ periodId, selectedCategory, onSelectCategory }) => {
  const [summary, setSummary] = useState({
    classesRevenue: 0,
    privateLessonsRevenue: 0,
    eventsRevenue: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      const result = await getPeriodRevenueSummary(periodId);
      setSummary(result);
    };
    fetchSummary();
  }, [periodId]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-dark">
        Total Revenue for this period
      </h3>
      <p className="mt-1 text-4xl font-bold text-brand-dark">
        ${summary.totalRevenue.toFixed(2)}
      </p>
      <hr className="my-3 border-brand-dark/10" />
      <div className="space-y-1">
        <SummaryRow
          label="Classes"
          amount={summary.classesRevenue}
          selected={selectedCategory === "classes"}
          onClick={() => onSelectCategory?.("classes")}
        />
        <SummaryRow
          label="Private Lessons"
          amount={summary.privateLessonsRevenue}
          selected={selectedCategory === "private_lessons"}
          onClick={() => onSelectCategory?.("private_lessons")}
        />
        <SummaryRow
          label="Events"
          amount={summary.eventsRevenue}
          selected={selectedCategory === "events"}
          onClick={() => onSelectCategory?.("events")}
        />
      </div>
    </div>
  );
};

export default PeriodRevenueSummary;
