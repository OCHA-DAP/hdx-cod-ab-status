# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Prettier format check + ESLint
npm run format       # Format with Prettier
npm run check        # Svelte type checking (svelte-check)
npm run check:watch  # Type checking in watch mode
```

There is no test suite configured in this project.

## Architecture

This is a **Svelte 5 + SvelteKit** application (part of OCHA-DAP's HDX COD AB Status tooling) built with Vite and TypeScript in strict mode.

**Routing:** SvelteKit's file-based routing under `src/routes/`. Each `+page.svelte` is a route; `+layout.svelte` wraps all routes.

**Shared code:** `src/lib/` — imported via the `$lib` alias. Exports are re-exported through `src/lib/index.ts`.

**HTML shell:** `src/app.html` is the document template that SvelteKit injects into.

**Svelte 5 runes** are enabled in `svelte.config.js` — use `$state`, `$derived`, `$effect`, etc. rather than the Svelte 4 reactive declarations.

**Deployment adapter:** `@sveltejs/adapter-auto` auto-detects the deployment target at build time.

**Formatting:** Prettier with 100-character line width and Svelte plugin. Run `npm run format` before committing.
