"use client";
import { Drawer, DrawerContent } from "@/app/components/ui/Drawer";

// Plain-language definitions of the terms the dashboard uses, opened
// from the ? menu in every PageHeader.
const GLOSSARY = [
  {
    heading: "Setting up your studio",
    terms: [
      {
        term: "Period",
        definition:
          "One session of classes with a start and end date, like “May 2026”. Students pay per period, and each period has its own prices and weekly schedule.",
      },
      {
        term: "Location",
        definition:
          "A studio space where you teach. Each period has a separate schedule for every active location. Inactive locations keep their history but stop showing up in new schedules.",
      },
      {
        term: "Class type",
        definition:
          "A track of classes, like Salsa or Bachata. It holds that track's levels in order.",
      },
      {
        term: "Class (level)",
        definition:
          "One step in a class type, like Salsa 2. Its position in the class type decides what comes next.",
      },
      {
        term: "Schedule",
        definition:
          "Which classes run at each location during a period, and on which day and time. A new period copies the last period's schedule and moves each class up one level, so students continue where they left off.",
      },
      {
        term: "Default prices",
        definition:
          "The price options set in Settings. They fill in every new period automatically, and can be changed per period.",
      },
    ],
  },
  {
    heading: "Day to day",
    terms: [
      {
        term: "Payment",
        definition:
          "What a student paid for a period and the classes it covers. Event payments are recorded on the event itself.",
      },
      {
        term: "Credit",
        definition:
          "Money kept on a student's account to put toward future payments. Added and applied from the payment form.",
      },
      {
        term: "Event",
        definition:
          "A one-off workshop or social. It has an advance price and a day-of price; the day-of price applies on the date of the event, in the studio's timezone.",
      },
      {
        term: "Private lesson",
        definition:
          "A one-on-one lesson with an instructor, separate from period classes. The studio fee from Settings is taken out of the instructor's pay in the private lesson reports.",
      },
      {
        term: "Notes",
        definition:
          "Notes about a student, visible to the whole team. Notes not yet marked complete are counted in the sidebar.",
      },
    ],
  },
  {
    heading: "Your team",
    terms: [
      {
        term: "Admin",
        definition:
          "Can do everything, including periods, locations, instructors, private lessons, settings and inviting the team.",
      },
      {
        term: "Staff",
        definition:
          "Manages students, classes, payments, events and notes day to day, but can't change the studio setup.",
      },
    ],
  },
];

function GlossaryDrawer({ open, onOpenChange }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title="Glossary"
        description="The words aka Move uses, in plain language."
      >
        <div className="space-y-8">
          {GLOSSARY.map((section) => (
            <section key={section.heading}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-dark/50">
                {section.heading}
              </h3>
              <dl className="space-y-4">
                {section.terms.map(({ term, definition }) => (
                  <div key={term}>
                    <dt className="text-sm font-semibold text-brand-dark">{term}</dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-brand-dark/70">
                      {definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default GlossaryDrawer;
