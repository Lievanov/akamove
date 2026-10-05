"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as RadixPopover from "@radix-ui/react-popover";
import { BookOpen, CircleHelp, ListChecks, Route } from "lucide-react";
import { useOnboarding } from "@/app/context/OnboardingContext";
import { IconButton } from "@/app/components/ui/IconButton";

// The ? button in PageHeader: replay this page's tour, open the
// glossary, or bring back the setup checklist. Renders nothing outside
// the dashboard.
function HelpMenu() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const [open, setOpen] = useState(false);

  if (!onboarding) return null;
  const { pageTour, startTour, openGlossary, setup, showChecklist } = onboarding;
  const setupUnfinished = setup && setup.completed < setup.total;

  const choose = (action) => {
    setOpen(false);
    action();
  };

  const items = [
    pageTour && {
      icon: Route,
      label: "Show me around this page",
      onSelect: () => startTour(pageTour),
    },
    {
      icon: BookOpen,
      label: "Glossary",
      onSelect: openGlossary,
    },
    setupUnfinished && {
      icon: ListChecks,
      label: `Studio setup (${setup.completed}/${setup.total})`,
      onSelect: () => {
        showChecklist();
        router.push("/dashboard");
      },
    },
  ].filter(Boolean);

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger asChild>
        <IconButton aria-label="Help" className="text-brand-dark/60 hover:text-brand-dark">
          <CircleHelp className="h-5 w-5" />
        </IconButton>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 rounded-lg border border-brand-dark/10 bg-white p-1 shadow-lg focus:outline-none"
        >
          {items.map(({ icon: Icon, label, onSelect }) => (
            <button
              key={label}
              type="button"
              onClick={() => choose(onSelect)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-brand-dark hover:bg-brand-dark/5 focus:outline-none focus-visible:bg-brand-dark/5"
            >
              <Icon className="h-4 w-4 shrink-0 text-brand-pink-deep" />
              {label}
            </button>
          ))}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export default HelpMenu;
