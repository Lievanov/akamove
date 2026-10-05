"use client";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useOnboarding } from "@/app/context/OnboardingContext";
import { Button, buttonVariants } from "@/app/components/ui/Button";
import { IconButton } from "@/app/components/ui/IconButton";
import { cn } from "@/app/components/ui/utils/cn";

// "Get your studio ready" card on the dashboard home, for admins whose
// studio setup isn't finished. Steps and their done-ness come from
// api/onboarding/setup.js via OnboardingContext.
//
// "Hide" folds it down to the header and progress bar; the X closes it
// for the whole studio, and only the ? menu brings it back.
function SetupChecklist() {
  const onboarding = useOnboarding();
  const setup = onboarding?.setup;

  if (!setup || setup.dismissed || setup.completed === setup.total) return null;

  const collapsed = onboarding.checklistCollapsed;
  const nextStepId = setup.steps.find((step) => !step.done)?.id;
  const percent = Math.round((setup.completed / setup.total) * 100);

  return (
    <section
      aria-labelledby="setup-checklist-title"
      className="mb-6 overflow-hidden rounded-lg border border-brand-dark/10 bg-white"
    >
      <div className="bg-brand-cream/50 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="setup-checklist-title"
              className="text-lg font-semibold text-brand-dark"
            >
              Get your studio ready
            </h2>
            {!collapsed && (
              <p className="mt-0.5 text-sm text-brand-dark/60">
                Each step builds on the one before — your first period needs
                prices, a location and classes to schedule.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-brand-dark/60"
              aria-expanded={!collapsed}
              aria-controls="setup-checklist-steps"
              onClick={() => onboarding.setChecklistCollapsed(!collapsed)}
            >
              {collapsed ? (
                <>
                  Show <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  Hide <ChevronUp className="h-4 w-4" />
                </>
              )}
            </Button>
            <IconButton
              aria-label="Close setup checklist"
              title="Close — reopen it any time from the ? menu"
              className="text-brand-dark/60 hover:text-brand-dark"
              onClick={() => onboarding.setChecklistDismissed(true)}
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuenow={setup.completed}
            aria-valuemin={0}
            aria-valuemax={setup.total}
            aria-label="Setup progress"
            className="h-2 flex-1 overflow-hidden rounded-full bg-white"
          >
            <div
              className="h-full rounded-full bg-brand-pink transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-medium text-brand-dark">
            {setup.completed} of {setup.total} done
          </span>
        </div>
      </div>

      {!collapsed && (
        <ol id="setup-checklist-steps" className="divide-y divide-brand-dark/10">
          {setup.steps.map((step, i) => {
            const isNext = step.id === nextStepId;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-4",
                  isNext && "bg-brand-pink/5"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    step.done
                      ? "bg-brand-pink-deep text-white"
                      : isNext
                        ? "border-2 border-brand-pink text-brand-pink-deep"
                        : "border border-brand-dark/20 text-brand-dark/50"
                  )}
                >
                  {step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      step.done ? "text-brand-dark/50 line-through" : "text-brand-dark"
                    )}
                  >
                    {step.title}
                  </p>
                  {!step.done && (
                    <p className="mt-0.5 text-sm text-brand-dark/60">{step.description}</p>
                  )}
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className={cn(
                      buttonVariants({
                        size: "sm",
                        variant: isNext ? "primary" : "outline",
                      }),
                      "shrink-0"
                    )}
                  >
                    {step.action}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default SetupChecklist;
