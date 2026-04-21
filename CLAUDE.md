# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

```bash
npm run dev         # Start development server
npm run build       # Production build
npm run preview     # Preview production build
npm run check       # Astro type checking
npm run lint        # Prettier format check + ESLint
npm run format      # Format with Prettier
npm run sync        # Copy work orders + reviews from OneDrive (sync-data.sh)
npm run fetch       # Run all Python data fetch scripts (uses python3)
npm run fetch:local # Same as fetch but uses uv (local dev with virtualenv)
npm run update      # Upgrade npm dependencies
```

There is no test suite configured in this project.

## Architecture

This is an **Astro** application (part of OCHA-DAP's HDX COD AB Status tooling) built with TypeScript in strict mode.

**Routing:** Astro's file-based routing under `src/pages/`. The main entry point is `src/pages/index.astro`.

**Shared code:** `src/lib/` — utility modules imported directly by pages.

**Data loading:** `src/lib/loadData.ts` handles all CSV parsing and joins (uses PapaParse). This is the main business logic file.

**Status model:** `src/lib/status.ts` defines badge styles and labels for the five work order statuses: Initialized, Processing, Feedback, Published, Blocked.

**Static assets:** `public/` directory for static files served as-is.

**Base path:** Configured via `BASE_PATH` environment variable in `astro.config.mjs` (used for GitHub Pages deployment).

**Formatting:** Prettier with Astro plugin. Run `npm run format` before committing.

## Components

| File                         | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `CycleOverview.astro`        | Year-by-year pipeline summary cards (open counts, status breakdown, review gaps) |
| `CurrentCycleSection.astro`  | Current year work orders organized by planned quarter and status                 |
| `BacklogSection.astro`       | Incomplete work orders from a specific prior year                                |
| `PriorBacklogSections.astro` | Renders a `BacklogSection` for each prior year with open items                   |
| `WorkOrderTable.astro`       | Generic table for displaying work orders grouped by quarter                      |
| `CoverageOverview.astro`     | Plan group cards showing GIS in/out ratios                                       |
| `PlanCoverageSection.astro`  | Supporting component for plan group detail                                       |
| `PreparednessSection.astro`  | Country-level table with plan types, GIS status, next review dates               |

## Data pipeline

```
SharePoint (OneDrive)
  └─ sync-data.sh ──► public/data/work.csv        (work orders)
                  ──► public/data/reviews.csv      (review schedule)

External APIs / ArcGIS
  └─ scripts/*.py ──► public/api/m49.csv           (UN country codes)
                  ──► public/api/gis.csv            (ArcGIS catalog)
                  ──► public/api/plans.csv          (humanitarian plans)
                  ──► public/api/regions.csv        (OCHA regions)
                  ──► public/api/offices.csv        (OCHA offices)
                  ──► public/api/cod_metadata.csv   (COD review dates)

src/lib/loadData.ts   ← reads + joins all of the above at build time
        │
        ▼
src/pages/index.astro ← passes computed data to components
```

`loadData.ts` joins on ISO3 country codes and computes pipeline stats, plan coverage groupings, next review dates, and overdue flags before passing structured data to each component.

## Deployment

GitHub Pages. Set `BASE_PATH` to the repo subdirectory path (e.g. `/hdx-cod-ab-status`) when building for a non-root deployment.
