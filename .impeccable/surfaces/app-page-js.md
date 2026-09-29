---
version: 1
slug: "app-page-js"
primary_target: "app/page.js"
related_targets: []
---

## Scope & visitor mode

Public marketing landing page (`app/page.js`), replacing the prior placeholder. Persuade mode. Not the dashboard — this is the only Persuade surface in the app; every other route is Operate.

## Audience, job, action, proof

Prospective dance-studio owners/admins evaluating whether to switch from paper/spreadsheets to aka Move. Job: understand the product replaces the spreadsheet, see real feature coverage and real pricing, sign up. Action: "Start free" (existing Google OAuth flow, same as dashboard login) — no demo/contact path yet (deliberately deferred by the user; the "Serious Business" tier's "Let's talk" button has no handler). Proof: real product capabilities from PRODUCT.md, grouped by studio "area," and the four real pricing tiers (with a monthly/yearly toggle, 15% off yearly) — no invented testimonials, customer counts, or screenshots (none exist; all UI representations are hand-authored flat SVG, explicitly illustrative rather than photographic).

## Chosen direction & memorable moment

Structural concept: scroll-through "studio areas" (Front Desk → The Floor → The Office → Green Room → Pricing → closing) as organic, full-bleed swelling color lobes — refusing the generic hero/grid/pricing/footer SaaS scaffold. Assigned via the impeccable skill's concept-seed roll (no image generation available in this environment, so resolved via text-only palette/fact cards, disclosed to the user at the time) and confirmed by the user's explicit pick over the assigned default and the plain-SaaS "canon" option.

Since the initial build, the user revised two things toward more conventional register, both intentional and now the committed state, not open items:
- **Color:** switched from a fully drenched world (dark/pink/cream rotation) to a light theme built from the same palette — white and cream paper grounds punctuated by full-bleed pink sections; brand-dark is text/chrome only now, never a full-bleed field. See DESIGN.md's Light-Theme-for-Persuade Rule.
- **Navigation:** the original signature capsule-pill scrollspy nav (one pill per studio-area landmark) was replaced with a standard sticky SaaS header — logo, Features/Pricing anchor links, ghost "Log In" + solid "Start free" CTA. The user's own words: they didn't like the "apartment complex stuff," wanted standard SaaS nav. `LobeNav.jsx` was deleted.

Memorable moment (still standing, revised): the hero's spreadsheet grid → live tablet roster reveal. Originally scroll-driven; the user pointed out a visitor who never scrolls would never see it, so it now plays once automatically ~700ms after the page mounts (a CSS custom property flip + a 1.4s transition), independent of scroll. The "sheet" is now an actual Excel-style grid (column letters, row numbers, cell contents, an active-cell selection with a fill handle) rather than a hand-drawn sign-in clipboard — the user clarified the slogan's "sheet" means a spreadsheet, not a paper sign-in sheet.

Six hand-authored organic SVG "coastline" dividers (distinct shapes, not repeated) still sit at each section boundary — unchanged by the above revisions.

## Unresolved decisions

- Contact/demo request path: intentionally not built. When it's added, it should get its own CTA distinct from "Start free," not reuse the sign-up button.
- No onboarding/tutorial flow yet after sign-up — out of scope per the user, to be designed separately.
