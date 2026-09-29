---
name: tailwind-ui-kit
description: Reusable Tailwind + Radix UI components and brand design tokens for the akamove app. Use whenever adding or editing UI anywhere in the app — reach for these components instead of writing one-off Tailwind markup or reaching for a new UI library.
---

# akamove Tailwind UI kit

akamove's UI is Tailwind CSS. `app/components/ui/` is the shared component kit — headless [Radix UI](https://www.radix-ui.com/) primitives styled with Tailwind. **All UI work should use these components first.** Only add a new primitive here if nothing in this kit fits.

**MUI has been fully removed** (all packages uninstalled: `@mui/material`, `@mui/icons-material`, `@mui/material-nextjs`, `@mui/x-charts`, `@mui/x-date-pickers`, `@emotion/react`, `@emotion/styled`, `@emotion/cache`). Never reintroduce an `@mui/*` import — this kit covers everything MUI used to.

All components import a shared class-merging helper: `import { cn } from "@/app/components/ui/utils/cn"` (`clsx` + `tailwind-merge`).

## Design tokens

Defined in `tailwind.config.js theme.extend`:

- **Colors** — `brand.pink` (`#E8195E`, primary accent, from the logo ring/wordmark), `brand.dark` (`#1B0E1E`, near-black aubergine, from the logo background), `brand.cream` (`#F7E7E2`, from the logo's "Move" wordmark). Use as `bg-brand-pink`, `text-brand-dark`, etc. These are estimated from the logo PNG — nudge them if a rendered swatch looks visibly off, but keep them centralized here rather than hardcoding hex values in components.
- **Fonts** — `font-sans` (Source Sans 3, `var(--font-sans)`) is the app default body font, set in `app/layout.js` via `next/font/google`. `font-display` (Fraunces, `var(--font-display)`) is for logo-adjacent/marketing use only — not for body copy or form UI.
- **Preflight is enabled** (Tailwind's base CSS reset) — this was intentionally disabled during the MUI→Tailwind migration to avoid corrupting coexisting MUI screens; it was re-enabled once MUI was fully removed. If you see unexpected global element styling (headings, buttons, form controls, lists), it's Preflight's browser-default reset, not a bug.
- **Tailwind is pinned to v3** (`tailwindcss@^3`), not v4 — this repo's `postcss.config.js` and `tailwind.config.js` use the v3 plugin/config API. Don't let `npm install` float it to v4 without deliberately migrating the config.

## Components (`app/components/ui/`)

| Component | Notes |
|---|---|
| `Button.jsx` | `cva`-based variants: `primary`/`secondary`/`outline`/`ghost`, sizes `sm`/`md`/`lg`. |
| `IconButton.jsx` | Circular icon-only button. Pair with `lucide-react` icons. |
| `TextInput.jsx` | RHF `Controller`-bound text field. Props: `property`, `label`, `errors`, `control`, `required`, `placeholder`, `rows` (textarea), `disabled`, `type`, `step`, `min`, `prefix`/`suffix` (e.g. `$`), `format(value)`/`parse(rawValue)` (live-formatted fields like phone numbers), `rules` (merged into the RHF `Controller` rules for custom `pattern`/`validate`). Renders `Input.jsx` internally. |
| `Input.jsx` | Plain styled input/textarea, not RHF-bound — for state that isn't a form field (e.g. a roster search box, or building a custom field like `TextInput`). Supports `error` (bool, red border), `prefix`/`suffix`. |
| `Select.jsx` | Two modes: **RHF mode** (`property`, `label`, `errors`, `control`, `required`) and **plain mode** (`value`/`onChange`, no `control` — values are always strings, since Radix Select values are strings; cast numeric values yourself). Takes `options={[{value, label}]}`. Built on `@radix-ui/react-select`. |
| `Combobox.jsx` | Search-as-you-type select built on `cmdk` + `Popover` (Radix). Supports `multiple` (bool, chips-in-trigger UI). Two modes: **RHF mode** (`property`/`control`/`errors`/`required` — value becomes `getOptionValue(option)`, a scalar, not the option object) and **plain mode** (`value`/`onChange` directly). Props: `options`, `getOptionLabel(option)`, `getOptionValue(option)` (default `.label`/`.id`), `placeholder`, `disabled`, `onSelectOption(option)` (RHF mode only — fires with the full option on selection, for side effects beyond setting the field), `onSearchChange(query)` (disables client-side filtering so the caller can drive `options` from a server search) + `searchPlaceholder`. |
| `DatePicker.jsx` | Two modes, same shape as `Select.jsx`: RHF mode and plain mode (`value`/`onChange`). Built on `react-day-picker` v10 + `Popover`. Value is a native `Date` or `null` — convert with `moment(date).format(...)` at the API boundary. |
| `Dialog.jsx` | Composition: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogActions`. Built on `@radix-ui/react-dialog` (focus trap, escape-to-close, scroll lock included). |
| `Tabs.jsx` | Composition: `Tabs` (root, `value`/`onValueChange` — string values), `TabsList`, `TabsTrigger`, `TabsContent`. Built on `@radix-ui/react-tabs`. `TabsTrigger` accepts arbitrary children (e.g. a `Chip` count badge). |
| `Checkbox.jsx` | Two modes: RHF (`property`, `label`, `control`) and plain (`checked`/`onCheckedChange`, no `control`). Built on `@radix-ui/react-checkbox`. |
| `Switch.jsx` | RHF-bound (`property`, `label`, `control`). Built on `@radix-ui/react-switch`. |
| `Chip.jsx` | Generic styled chip/badge (`label`, `color` or `className` for a custom background). |
| `ClassChips.jsx` | Domain-specific chip list for class assignments. Props: `colorIds`, `classes`, `router`, `periodId`, `openInNewTab`. Fixed 10-color id→hex palette. Built on `Chip.jsx`. |
| `Alert.jsx` | Inline, non-dismissing-by-default banner. `severity`: `success`/`error`/`warning`/`info`, optional `onClose`. |
| `Toast.jsx` | Wraps `Alert.jsx` with a self-dismiss `duration`/`onExited` contract, for post-redirect success/error banners. |
| `PageHeader.jsx` | Simple Tailwind page-title header bar (`title` prop). |
| `BackButton.jsx` | `routeTo` prop, `router.back()`-with-fallback behavior. |
| `Table.jsx` | Plain semantic `<table>` wrappers: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. No built-in sorting/filtering — pages that need it implement their own sort state and a clickable `TableHead` (see `app/components/charts/ClassByPeriodPerStudentCount.jsx` for the pattern: local sort state + `lucide-react` up/down icon, no extra primitive needed). |
| `Pagination.jsx` | Simple prev/next pager. Props: `page`, `totalItems`, `pageSize`, `onChange(page)`. |
| `PriceListEditor.jsx` | Dynamic list of `$`-prefixed price inputs with add/remove. Props: `prices`, `onChange`, `emptyText`. Built on `Input`/`Button`/`IconButton`. |

## Migration history (for context, not action items)

The app was migrated from Material-UI to this kit in phases (component kit → Locations/Instructors → Students → Payments → Private Lessons → Settings/Notes → Classes → Periods/Events → nav shell/charts/public pages/final MUI removal). A few components ended up shared across features that weren't their original "home": `PaymentForm.jsx`/`EventPaymentFields.jsx` are used by both Payments and the Events payment page; `GlobalNotes.jsx` is rendered globally from `DashboardNavbar.jsx` and `GoogleOAuth.jsx`, not just the Notes page. Both were migrated once, in place, rather than duplicated.

Several now-dead legacy files were deleted as part of the final cleanup pass (the old pre-kit `AlertComponent.jsx`, `BackButton.jsx`, `inputs/TextInput.jsx`, `inputs/PriceListEditor.jsx`, `inputs/ClassChips.jsx`, `lists/ClassesTable.jsx`, `form/CreditModal.jsx`, `charts/TotalIncomePerPeriod.jsx`, `MainDrawer.jsx`, `DashboardAppBar.jsx`) — if you're looking for one of these and it's gone, that's why; use the `app/components/ui/` equivalent instead.

## Extending the kit

If a task needs UI behavior this kit doesn't cover yet, build it as a new primitive in `app/components/ui/` (following the dual RHF/plain-mode pattern where relevant) rather than a one-off. This is how `DatePicker`, `Combobox`, and `Tabs` came to exist, and how `Select`/`DatePicker`/`Checkbox`/`Combobox` gained their plain (non-RHF) modes.
