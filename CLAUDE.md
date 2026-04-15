# CLAUDE.md

This file provides guidance to claude code when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run preview   # Preview production build
npm run check     # Astro type checking
npm run lint      # Prettier format check + ESLint
npm run format    # Format with Prettier
npm run sync      # Run sync-data.sh to update data files
```

There is no test suite configured in this project.

## Architecture

This is an **Astro** application (part of OCHA-DAP's HDX COD AB Status tooling) built with TypeScript in strict mode.

**Routing:** Astro's file-based routing under `src/pages/`. The main entry point is `src/pages/index.astro`.

**Shared code:** `src/lib/` — utility modules imported directly by pages.

**Data loading:** `src/lib/loadData.ts` handles data fetching/parsing (uses PapaParse for CSV).

**Static assets:** `public/` directory for static files.

**Base path:** Configured via `BASE_PATH` environment variable in `astro.config.mjs` (used for GitHub Pages deployment).

**Formatting:** Prettier with Astro plugin. Run `npm run format` before committing.
