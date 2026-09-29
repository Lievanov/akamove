---
name: aka Move
description: Studio-management dashboard and public site for dance studios
colors:
  brand-pink: "#E8195E"
  brand-dark: "#1B0E1E"
  brand-cream: "#F7E7E2"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.25rem, 8vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  full: "9999px"
  card: "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "40px"
  section: "112px"
components:
  button-primary:
    backgroundColor: "{colors.brand-pink}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.brand-dark}"
    textColor: "{colors.brand-cream}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.brand-dark}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
---

# Design System: aka Move

## Overview

**Creative North Star: "The Studio Floor"**

aka Move runs two registers on one shared token set. The dashboard (Operate) is a fast, neutral working surface — white and near-white fields, brand-dark text, brand-pink used sparingly as the single accent on buttons, focus rings, and active states. The public marketing site (Persuade) is a light theme built from the same palette: sections alternate between plain white and brand-cream as the paper ground, with brand-pink used as the vibrant, full-bleed punctuation color on select sections (Front Desk, Green Room, Closing) rather than as a small accent. Brand-dark never fills a whole section on the public site — it stays a text and small-element color there, same as in the dashboard. Nothing about the palette changes between the two registers — only how much of the surface pink is allowed to own, and whether the ground is neutral-restrained (Operate) or alternating light fields (Persuade).

Fraunces (serif, distinctive ball terminals and high-contrast strokes) is reserved for display moments: the logo wordmark and Persuade-surface headlines. It never appears in dashboard chrome, form labels, or body copy — that's Source Sans 3 everywhere, at every weight from 300 to 700.

**Key Characteristics:**
- One three-color palette (brand-pink, brand-dark, brand-cream), no exceptions, no additional hues.
- Operate = restrained (neutral/white surfaces, pink as accent). Persuade = light theme: white/cream paper grounds punctuated by full-bleed pink sections; brand-dark is a text color on both registers, never a full-bleed field.
- Fraunces for display only; Source Sans 3 for everything functional.
- Flat by default; shadow appears only to mark a single elevated/featured state, never as ambient decoration.

## Colors

Three brand colors, sourced from the aka Move logo (public/images/am_logo.png), used at different intensities depending on whether the surface is for operating the studio or persuading a visitor to join.

### Primary
- **Signal Pink** (`#E8195E`): the one accent. On Operate surfaces: primary buttons, focus rings, active/selected states, links on hover. On Persuade surfaces: a full section field in its own right (Front Desk, Green Room, Closing lobes), plus the featured pricing tier's card background.

### Neutral
- **Aubergine Dark** (`#1B0E1E`): primary text color everywhere, dashboard and public site alike. Never a full-bleed section background on the public site; it appears as text, icon strokes, the secondary button fill, and the fixed capsule-pill nav's own background (a deliberately dark UI-chrome element that reads consistently over every light section behind it).
- **Rose Cream** (`#F7E7E2`): a paper/light neutral field on Persuade surfaces (The Floor, Pricing) and reversed text color on pink fields.
- White (`#ffffff`): the base ground for both registers — dashboard component surfaces (inputs, selects, dialogs, cards), and on the public site the Hero and The Office sections, plus card fills in Pricing.

### Named Rules
**The Brand-Only Rule.** Every surface in the app — dashboard or public site — draws its color exclusively from brand-pink, brand-dark, and brand-cream (plus opacity variants of those three, and plain white/black as neutrals). No other hue is introduced anywhere.

**The Light-Theme-for-Persuade Rule.** The public site's ground is always light — white or brand-cream, never brand-dark — with brand-pink used as full-bleed punctuation on roughly half the sections for vibrancy. Brand-dark supplies text and small UI chrome (buttons, nav, icon strokes) on the public site exactly as it does on the dashboard; it is never a page-filling field there.

## Typography

**Display Font:** Fraunces (with Georgia, serif fallback)
**Body Font:** Source Sans 3 (with system-ui fallback)

**Character:** A confident serif display against a plain, highly legible sans body — the pairing reads as "considered brand, fast tool": Fraunces carries personality at headline scale, Source Sans 3 disappears into the task everywhere else.

### Hierarchy
- **Display** (400–500 weight, `clamp(2.25rem, 8vw, 4.5rem)`, leading-none, tracking `-0.02em` to `-0.03em`): Persuade-surface headlines and the logo wordmark only. Never used in dashboard UI.
- **Body** (400 weight, `1rem`–`1.125rem`, leading 1.5): all paragraph copy, dashboard and public site alike.
- **Label** (500–600 weight, `0.75rem`–`0.875rem`): form field labels, button text, nav items.

### Named Rules
**The Display-Is-Marketing-Only Rule.** Fraunces never appears in a form label, table header, button, or any dashboard chrome. If it's functional UI, it's Source Sans 3.

## Layout

Two rhythms, evidenced by their actual use:
- **Operate (dashboard):** dense, form- and table-first; components sit on white cards/fields with compact internal padding (`px-3 py-2` on inputs/selects) — optimized for scanning and fast data entry, not for dwelling.
- **Persuade (public site):** one big idea per screen. Sections run `py-28` (112px vertical) with `max-w-5xl`–`max-w-6xl` content columns; feature grids use generous `gap-x-10 gap-y-10`. The page is built to be walked through, not scanned.

Responsive behavior on Persuade surfaces: multi-column grids (feature pairs, pricing tiers) collapse to a single column below `sm`; the sticky top nav collapses its links and auth actions into a hamburger drawer below `md`.

## Elevation & Depth

Flat by default across both registers. Dashboard components use only `shadow-sm` (inputs, selects) or `shadow-lg`/`shadow-xl` on floating surfaces that need to visually detach from the page (select menus, dialogs) — never on resting content. The Persuade world stays flat and color-blocked with one deliberate exception.

### Shadow Vocabulary
- **Resting field shadow** (`shadow-sm`): dashboard inputs/selects, to lift them fractionally off the white page.
- **Floating surface shadow** (`shadow-lg` / `shadow-xl`): dropdown menus and dialogs, to read as detached overlays.
- **Featured-tier glow** (`box-shadow: 0 20px 45px -20px rgba(232,25,94,0.55)`): the one intentionally elevated element on the whole site — the recommended pricing tier's card. A colored, soft-blurred shadow tinted from brand-pink itself, not a generic gray.

### Named Rules
**The One Elevated Card Rule.** At most one card on a given screen carries a shadow used to mean "this one, not the others" (the featured pricing tier). Every other card in that same set stays flat with a border only.

## Shapes

- **Buttons, inputs, selects:** `rounded-md` (6px) — a small, functional radius, not a rounded-pill default.
- **Dialogs, floating menus:** `rounded-lg` (8px).
- **Icon buttons, chips, nav pills, avatar/icon badges:** `rounded-full`.
- **Persuade-surface cards (pricing tiers):** `rounded-3xl` (24px) — noticeably softer than dashboard cards, matching the Persuade world's larger scale.
- **Lobe dividers (Persuade only):** section boundaries are not straight edges. Each is a distinct, hand-authored organic SVG curve (never a repeated shape across the same page) filled with the next section's color, so the page reads as swelling color fields rather than stacked rectangles.

## Components

### Buttons
- **Shape:** `rounded-md` (6px), consistent across both registers.
- **Primary:** `bg-brand-pink` / white text.
- **Secondary:** `bg-brand-dark` / cream text.
- **Outline:** transparent, `border-brand-dark/20`, `text-brand-dark`.
- **Ghost:** transparent, `text-brand-dark`, hover `bg-brand-dark/5`.
- **Focus:** `ring-2 ring-brand-pink`, offset 2px — the one focus treatment used everywhere, dashboard and public site.

### Cards / Containers
- **Dashboard:** white background, `rounded-md`/`rounded-lg`, `shadow-sm` at rest, `border-brand-dark/10`.
- **Persuade pricing cards:** `rounded-3xl`, either a flat `border-brand-dark/12` + translucent white fill, or (featured tier only) a solid `bg-brand-pink` fill with the featured-tier glow shadow.

### Inputs / Fields
- **Style:** white fill, `border`, `rounded-md`, `shadow-sm`.
- **Focus:** `ring-2 ring-brand-pink`, no border-color change.
- **Disabled:** `bg-brand-dark/5`, cursor not-allowed.

### Navigation
- **Dashboard:** `DashboardNavbar`, sidebar-based, role-gated.
- **Public site:** a standard SaaS header — logo, text nav links (Features, Pricing) as in-page anchors, a ghost "Log In" and a solid pink "Start free" CTA, right-aligned. Sticky to the top of the viewport (`sticky top-0`, white/90 + backdrop-blur) so it stays legible over every lobe color as the page scrolls. Mobile collapses nav links + both auth actions into a hamburger drawer. No scrollspy or active-section highlighting — plain anchor links, the category-standard pattern.

### Signature: Sheet-to-Tablet Reveal (Persuade only)
The public site's hero includes one authored motion moment: a spreadsheet grid (column letters, row numbers, an active-cell selection with a fill handle) fades/rotates away while a tablet-style live roster mockup fades in. It's a one-shot trigger, not a scroll-linked drag: the first pixel of scroll flips a `--reveal` CSS custom property from 0 to 1, and a 0.9s `cubic-bezier(0.16, 1, 0.3, 1)` transition on `opacity`/`transform` does the animating — scrolling further, or back up, doesn't affect it further. The trigger listens on `window` with `{ capture: true }` rather than a plain bubbling scroll listener, since a "scroll" event never bubbles and this app's dashboard shell makes `<body>` the real scroll container in places; capture still sees it on the way down from `window` regardless of which element actually scrolled. `prefers-reduced-motion: reduce` skips straight to the revealed state. This is the only motion moment on the site; it is not repeated as a generic entrance animation elsewhere.

## Do's and Don'ts

### Do:
- **Do** keep the palette to brand-pink, brand-dark, and brand-cream (plus their opacity variants) everywhere, dashboard and public site alike.
- **Do** reserve Fraunces for display-scale headlines and the wordmark; Source Sans 3 for everything else.
- **Do** keep Operate surfaces restrained (pink as accent on white/neutral) and reserve full-saturation, full-bleed color fields for Persuade surfaces.
- **Do** author organic section dividers as distinct shapes when a Persuade surface uses the "swelling color lobe" form — never repeat the same curve twice on one page.

### Don't:
- **Don't** fill a whole Persuade section with brand-dark. The public site's ground is always light (white or cream); brand-dark stays a text/chrome color there, same role it has on the dashboard.
- **Don't** use `rounded-3xl` card radii or full-bleed pink color sections inside the dashboard — that scale and intensity belongs to Persuade surfaces only.
- **Don't** add a second accent color "just for this one chart or banner" — extend the three-token palette's opacity/tint range instead.
- **Don't** assume a `window` scroll listener will fire; this codebase has scroll containers other than `window` in places, so scroll-position effects should measure the target element's own `getBoundingClientRect()`.
