---
colors:
  # Brand
  primary: "#007CE0"
  primary-dark: "#0056A3"
  primary-subtle: "#EDF6FD"
  on-primary: "#FFFFFF"

  # Surfaces
  surface: "#FFFFFF"
  surface-page: "#F4F4F4"
  surface-table-header: "#EEEEEE"

  # Borders
  border: "#CCCCCC"

  # Text
  text-primary: "#333333"
  text-secondary: "#888888"

  # Status — mirror JIRA palette, never remap to brand colors
  status-done-bg: "#C6EFCE"
  status-done-text: "#1E6B2E"
  status-in-progress-bg: "#FFF2CC"
  status-in-progress-text: "#7A5A00"
  status-blocked-bg: "#FCE4D6"
  status-blocked-text: "#8B3A0E"
  status-selected-bg: "#E0F2FE"
  status-selected-text: "#075985"
  status-backlog-bg: "#EEEEEE"
  status-backlog-text: "#888888"
  status-cancelled-bg: "#FFC7CE"
  status-cancelled-text: "#8B0C1A"

  # Warning rows
  warn-bg: "#FFF8E7"
  warn-hover-bg: "#FFF3D0"

typography:
  body:
    fontFamily: "'Source Sans Pro', sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.5"
    color: "#333333"
  label:
    fontSize: "12px"
    fontWeight: "600"
    letterSpacing: "0.03em"
  label-caps:
    fontSize: "12px"
    fontWeight: "700"
    textTransform: "uppercase"
    letterSpacing: "0.03em"
  heading-lg:
    fontSize: "28px"
    fontWeight: "700"
    color: "#000000"
  heading-md:
    fontSize: "20px"
    fontWeight: "600"
    color: "#007CE0"
  heading-sm:
    fontSize: "16px"
    fontWeight: "700"
    color: "#333333"
  mono:
    fontFamily: "ui-monospace, monospace"
    fontSize: "12px"

rounded:
  sm: "3px"
  md: "3px"
  full: "999px"

spacing:
  xs: "5px"
  sm: "10px"
  md: "15px"
  lg: "20px"
  xl: "35px"

dimensions:
  page-max-width: "1200px"
  page-padding: "35px"
  border-width: "1px"
---

# COD-AB Status Dashboard — Design

An internal OCHA/HDX operational tool intended to live under `data.humdata.org`. It should feel indistinguishable from a native HDX page — same colors, typography, surface treatments, and spatial rhythm.

## Colors

`#007CE0` is the single accent, used for links, active tabs, section headings, and interactive elements. Hover and focus states darken to `#0056A3`.

`#EDF6FD` is HDX's signature light-blue tint, used wherever something is selected or active (active tab fill, current-cycle card background, highlighted info boxes). It reads as "selected" to any regular HDX user.

Surfaces are a two-level stack: white (`#FFFFFF`) cards on a `#F4F4F4` page background — the exact values HDX uses on its search and detail pages. Borders are `#CCCCCC` throughout, not a blue-gray.

Status colors track JIRA's own palette and must never be remapped to brand colors.

## Typography

Source Sans Pro from Google Fonts (weights 400, 600, 700). Body text is `#333333` at 14px — HDX's standard. Secondary text (metadata, timestamps, helper labels) is `#888888`.

Heading hierarchy: page title 28px/700/`#000`; section headings 20px/600/`#007CE0`; sub-headings 16px/700/`#333333`. Table column headers use label-caps (12px, 700, uppercase, 0.03em) on `#EEEEEE`. Monospace is reserved for ISO3 codes and date strings.

## Layout

Single-column, max 1200px, 35px side padding (matching HDX detail pages). Section cards are white with a `1px #CCCCCC` border and `3px` radius — the same flat card geometry HDX uses throughout. No drop shadows anywhere.

## Components

**Tabs** — active: `#EDF6FD` fill + `#007CE0` border; inactive: no fill, `#CCCCCC` border on hover. The large counter is `#007CE0` when active, `#888888` when inactive.

**Badges** — JIRA status pill, `border-radius: 999px`, 12px/600. Background and text color always travel as a pair.

**Count chips** — small inline numeric summaries. Neutral (`#EEEEEE`/`#888888`), warn, and done variants follow the status palette.

**Table headers** — `#EEEEEE` background, label-caps, `position: sticky`.

**Cycle cards** — current cycle uses `#EDF6FD` background to call it out; prior-year cards are plain white. No decoration beyond the border.

## Pitfalls

- `#3B82F6` (Tailwind blue-500) looks similar to `#007CE0` but is off-brand — never use it.
- Border-radius above `3px` on cards or tabs looks foreign on HDX — keep it flat.
- No `box-shadow` on cards or tabs; HDX is entirely flat-bordered.
- Status badge colors are functional identifiers that match JIRA — do not adjust them for visual consistency with the brand palette.
