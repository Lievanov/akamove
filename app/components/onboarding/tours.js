// Page tours for the dashboard. Each step's `target` matches a
// `data-tour="..."` attribute on the page (see app/components/ui/Tour.jsx);
// a step without a target is shown centered. Steps whose target isn't
// rendered for the current user are skipped automatically.
//
// A tour's `id` is what gets stored in profiles.tours_seen — renaming
// one makes it show again for everyone.

export const TOURS = {
  staffWelcome: {
    id: "staff-welcome",
    steps: [
      {
        title: "Welcome to aka Move",
        body: "Here's a quick look at where things live. You can replay this any time from the ? button at the top of each page.",
      },
      {
        target: "nav-students",
        side: "right",
        title: "Students",
        body: "Look up students, add new ones and see which classes they're in.",
      },
      {
        target: "nav-payments",
        side: "right",
        title: "Payments",
        body: "Record what students pay for a period or event, and look up their payment history.",
      },
      {
        target: "nav-events",
        side: "right",
        title: "Events",
        body: "Workshops and socials. Take event payments here — the day-of price applies automatically on the day.",
      },
      {
        target: "nav-notes",
        side: "right",
        title: "Notes",
        body: "Notes left about students. The badge counts the ones still pending.",
      },
      {
        target: "add-note",
        side: "right",
        title: "Add a note from anywhere",
        body: "Jot down something about a student without leaving the page you're on.",
      },
    ],
  },

  settings: {
    id: "settings",
    steps: [
      {
        target: "settings-prices",
        title: "Default prices",
        body: "The price options students can pay for a period (e.g. 1 class, 2 classes, unlimited). Every new period starts with these — you can still change them per period.",
      },
      {
        target: "settings-fee",
        title: "Private lesson studio fee",
        body: "What the studio keeps from each private lesson. It's taken out of the instructor's pay in the private lesson reports.",
      },
      {
        target: "settings-timezone",
        title: "Timezone",
        body: "Decides what counts as “the day of” an event, so the day-of price kicks in at the right time.",
      },
      {
        target: "settings-team",
        title: "Your team",
        body: "Invite staff and other admins. Staff can manage students, payments and events; admins can also change periods, locations and settings.",
      },
    ],
  },

  locations: {
    id: "locations",
    steps: [
      {
        title: "Locations",
        body: "Each studio space you teach in is a location. When you build a period, you set a separate weekly schedule for every active location.",
      },
      {
        target: "locations-add",
        title: "Add a location",
        body: "Give it a name and address. Capacity and notes are optional.",
      },
      {
        target: "locations-table",
        side: "top",
        title: "Active or inactive",
        body: "Inactive locations stop appearing in new period schedules, but their past schedules and history are kept.",
      },
      {
        target: "nav-location-picker",
        side: "right",
        title: "Location picker",
        body: "Switch which location the dashboard is showing.",
      },
    ],
  },

  classes: {
    id: "classes",
    steps: [
      {
        title: "How classes work",
        body: "A class type is a track, like Salsa. Its classes are the levels in order: Salsa 1 → Salsa 2 → Salsa 3. Periods schedule these classes at your locations.",
      },
      {
        target: "classes-update",
        title: "Create and order classes",
        body: "Add class types and their levels here, and drag levels into order.",
      },
      {
        target: "classes-table",
        side: "top",
        title: "Who's in which class",
        body: "Every student's classes and what they paid, by period.",
      },
    ],
  },

  classesUpdate: {
    id: "classes-update",
    steps: [
      {
        target: "class-type-create",
        title: "1. Create a class type",
        body: "Start with the track, e.g. “Salsa” or “Bachata”.",
      },
      {
        target: "class-type-select",
        title: "2. Pick it to add levels",
        body: "Choose a class type to see its levels and add new ones, like Salsa level 1.",
      },
      {
        target: "class-levels",
        side: "top",
        title: "3. Order matters",
        body: "Drag levels into order, then click Save — new levels aren't kept until you do. When you create a new period, each scheduled class moves up to the next level in this list.",
      },
    ],
  },

  periods: {
    id: "periods",
    steps: [
      {
        title: "Periods",
        body: "A period is one session of classes, like “May 2026”. Students pay per period, and each period has its own prices and weekly schedule.",
      },
      {
        target: "periods-add",
        title: "Start a new period",
        body: "Set the dates and prices, then add classes to each location's schedule. After your first one, the previous schedule is copied over for you.",
      },
      {
        target: "periods-report",
        side: "left",
        title: "Reporting",
        body: "Revenue and enrollment for the period, class by class.",
      },
    ],
  },

  periodForm: {
    id: "period-form",
    steps: [
      {
        target: "period-details",
        title: "Name and dates",
        body: "Name it after the session, like “May 2026”.",
      },
      {
        target: "period-pricing",
        title: "Prices",
        body: "Filled in from your default prices in Settings. Change them here just for this period.",
      },
      {
        target: "period-schedule",
        side: "top",
        title: "Weekly schedule",
        body: "One tab per active location. Add a class for each day and time it runs at that location.",
      },
    ],
  },

  students: {
    id: "students",
    steps: [
      {
        target: "students-add",
        title: "Add a student",
        body: "Create a student record with their contact details.",
      },
      {
        target: "students-search",
        title: "Find anyone fast",
        body: "Search by name or phone number.",
      },
      {
        target: "students-table",
        side: "top",
        title: "Student list",
        body: "Open a student to see their details and the classes they're in.",
      },
    ],
  },

  payments: {
    id: "payments",
    steps: [
      {
        target: "payments-search",
        title: "Find a payment",
        body: "Search by student name, phone number or payment method.",
      },
      {
        target: "payments-table",
        side: "top",
        title: "Payment history",
        body: "Every payment students have made. From here you can open a student's full payment history or edit a payment.",
      },
    ],
  },

  events: {
    id: "events",
    steps: [
      {
        target: "events-add",
        title: "Create an event",
        body: "Workshops, socials and other one-offs. Each has an advance price and a day-of price.",
      },
      {
        target: "events-search",
        title: "Find an event",
        body: "Search by event name.",
      },
      {
        target: "events-table",
        side: "top",
        title: "Take payments",
        body: "Use an event's payment button to record who paid. The day-of price applies automatically on the day of the event.",
      },
    ],
  },
};
