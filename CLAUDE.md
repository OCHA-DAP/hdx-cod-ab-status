# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

See [DESIGN.md](./DESIGN.md) for brand tokens and visual conventions. Follow it for all styling work.

## Commands

```bash
npm run dev         # Start development server
npm run build       # Production build
npm run preview     # Preview production build
npm run check       # Astro type checking
npm run lint        # Prettier format check + ESLint
npm run format      # Format with Prettier
npm run fetch       # Run all Python data fetch scripts (uses python3) and write public/data/last_updated.txt
npm run fetch:local # Same as fetch but uses uv (local dev with virtualenv)
npm run update      # Upgrade npm dependencies
```

There is no test suite configured in this project.

## UI verification

Use `playwright-cli` to verify UI changes against the dev server. It uses a persistent browser session — open the browser once, then issue commands against it.

```bash
npm run dev                                              # start dev server first (default port 4321)
npx playwright-cli open http://localhost:4321            # open browser and navigate to app
npx playwright-cli screenshot --filename snap.png        # screenshot current viewport
npx playwright-cli screenshot --filename snap.png --full-page  # full-page screenshot
npx playwright-cli goto http://localhost:4321            # navigate in existing session
npx playwright-cli snapshot                              # capture accessibility snapshot (element refs)
npx playwright-cli close                                 # close browser session
```

## Architecture

This is an **Astro** application (part of OCHA-DAP's HDX COD AB Status tooling) built with TypeScript in strict mode.

**Routing:** Astro's file-based routing under `src/pages/`. The main entry point is `src/pages/index.astro`.

**Shared code:** `src/lib/` — utility modules imported directly by pages.

**Data loading:** `src/lib/loadData.ts` handles all CSV parsing and joins (uses PapaParse). This is the main business logic file.

**Status model:** `src/lib/status.ts` defines badge styles and labels for the six work order statuses (mirrored from JIRA): Backlog, Selected for Development, In Progress, Blocked, Done, Cancelled. "Backlog" represents a country expected to need a boundary update with no work order opened yet; "Selected for Development" represents an opened work order awaiting work.

**Static assets:** `public/` directory for static files served as-is.

**Base path:** Configured via `BASE_PATH` environment variable in `astro.config.mjs` (used for GitHub Pages deployment).

**Formatting:** Prettier with Astro plugin. Run `npm run format` before committing.

## Components

| File                        | Purpose                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| `PipelineSummary.astro`     | Overall pipeline status breakdown card (all work orders, regardless of year) |
| `WorkOrdersSection.astro`   | All work orders organized by planned quarter and status, regardless of year  |
| `WorkOrderTable.astro`      | Generic table for displaying work orders grouped by quarter                  |
| `CoverageOverview.astro`    | Plan group cards showing GIS in/out ratios                                   |
| `PlanCoverageSection.astro` | Supporting component for plan group detail                                   |
| `PreparednessSection.astro` | Country-level table with plan types, GIS status, next review dates           |

## Data pipeline

```
JIRA (humanitarian.atlassian.net, project COD, epic COD-51)
  └─ scripts/jira.py ──► public/data/work.csv      (work orders, all statuses)

External APIs / ArcGIS
  └─ scripts/*.py ──► public/data/m49.csv           (UN country codes)
                  ──► public/data/gis.csv           (ArcGIS catalog)
                  ──► public/data/plans.csv         (humanitarian plans)
                  ──► public/data/regions.csv       (OCHA regions)
                  ──► public/data/offices.csv       (OCHA offices)
                  ──► public/data/cod_metadata.csv  (COD review dates)
                  ──► public/data/hdx.csv           (HDX dataset presence)

npm run fetch ──► public/data/last_updated.txt     (UTC timestamp written after all scripts succeed)

src/lib/loadData.ts   ← reads + joins all of the above at build time
        │
        ▼
src/pages/index.astro ← passes computed data to components
```

`loadData.ts` joins on ISO3 country codes and computes pipeline stats, plan coverage groupings, next review dates, and overdue flags before passing structured data to each component.

## Deployment

GitHub Pages. Set `BASE_PATH` to the repo subdirectory path (e.g. `/hdx-cod-ab-status`) when building for a non-root deployment.
