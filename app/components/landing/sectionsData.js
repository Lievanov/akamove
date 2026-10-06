import {
  Users,
  CreditCard,
  CalendarRange,
  LineChart,
  ShieldCheck,
  Clock3,
  PartyPopper,
  MapPin,
  UserRound,
  NotebookPen,
} from "lucide-react";
import { YEARLY_DISCOUNT, planPrice } from "@/lib/billing/catalog.mjs";

export const frontDesk = {
  id: "front-desk",
  label: "Front Desk",
  bg: "bg-brand-pink",
  text: "text-white",
  heading: "Where the sheet used to live",
  description:
    "Every student's classes, payments, and history — on one card instead of one clipboard.",
  features: [
    {
      icon: Users,
      title: "Students",
      description:
        "Roster, classes, and contact info in one place — searchable instead of stapled.",
    },
    {
      icon: CreditCard,
      title: "Payments",
      description:
        "Record payments per class and period, apply credits, and keep a running history per student.",
    },
  ],
};

export const floor = {
  id: "floor",
  label: "The Floor",
  bg: "bg-brand-cream",
  text: "text-brand-dark",
  heading: "Every class, every level, in order",
  description:
    "Classes are leveled and ordered by type. Periods hold the schedule, locations, and pricing that hold everything else together.",
  features: [
    {
      icon: CalendarRange,
      title: "Classes",
      description:
        "Class types and levels, ordered the way your studio actually teaches them.",
    },
    {
      icon: Clock3,
      title: "Periods",
      description:
        "Each session term keeps its own schedule per location, so one studio's Tuesday doesn't collide with another's.",
    },
  ],
};

export const office = {
  id: "office",
  label: "The Office",
  bg: "bg-white",
  text: "text-brand-dark",
  heading: "The numbers, without the spreadsheet",
  description:
    "One report for period revenue across classes, private lessons, and events. One set of doors for who gets to open it.",
  features: [
    {
      icon: LineChart,
      title: "Reporting",
      description:
        "Period revenue by date range, pulled from classes, private lessons, and events at once.",
    },
    {
      icon: ShieldCheck,
      title: "Roles",
      description:
        "Front-desk staff get the daily tools. Owners keep the money settings and studio roster.",
    },
  ],
};

export const greenRoom = {
  id: "green-room",
  label: "Green Room",
  bg: "bg-brand-pink",
  text: "text-white",
  heading: "Everything else your studio runs on",
  description:
    "Private lessons, events, locations, instructors, and notes — the parts of the day that don't fit a weekly schedule.",
  features: [
    {
      icon: PartyPopper,
      title: "Events",
      description:
        "Day-of and advance pricing, tracked apart from regular class payments.",
    },
    {
      icon: NotebookPen,
      title: "Private Lessons",
      description:
        "Sold in blocks, used one lesson at a time — separate from the recurring class schedule.",
    },
    {
      icon: MapPin,
      title: "Locations",
      description:
        "Every physical location keeps its own per-period class schedule.",
    },
    {
      icon: UserRound,
      title: "Instructors & Notes",
      description:
        "Instructors assigned per class, and a note on a student without ever leaving their page.",
    },
  ],
};

// Prices come from the billing catalog so the site, the dashboard and
// Stripe always agree.
export { YEARLY_DISCOUNT };

export const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    cadence: "forever",
    cap: "Up to 25 students",
    tone: "outline",
    features: ["Students", "Payments", "Classes"],
  },
  {
    name: "Studio",
    monthlyPrice: planPrice("studio"),
    cap: "Up to 100 monthly active students",
    tone: "solid",
    features: ["Everything in Starter", "Periods", "Reporting", "Roles"],
  },
  {
    name: "Pro Studio",
    monthlyPrice: planPrice("pro studio"),
    cap: "Up to 500 monthly active students",
    tone: "outline",
    features: [
      "Everything in Studio",
      "Notes",
      "Private Lessons",
      "Locations",
      "Instructors",
      "Events",
    ],
  },
  {
    name: "Serious Business",
    price: "Let's talk",
    cadence: "",
    cap: "500+ monthly active students",
    tone: "outline",
    features: ["Everything in Pro Studio", "Built around your studio"],
  },
];
