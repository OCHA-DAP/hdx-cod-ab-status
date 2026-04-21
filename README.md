# COD-AB Activity Tracker

A dashboard for monitoring humanitarian data work orders and geographic preparedness across OCHA's Common Operational Datasets (COD-AB) program.

## What it does

The tracker gives HDX team members a live view of where COD boundary data stands — what's being updated, what's overdue, and which locations are covered by humanitarian response plans. Data is synced weekly from SharePoint and ArcGIS sources.

### Work Orders tab

Tracks the pipeline of data update requests by year and quarter. Shows open work orders broken down by status (Initialized, Processing, Feedback, Published, Blocked), highlights locations where updates are expected but no work order exists yet, and archives prior-year backlogs.

### Coverage tab

Shows which locations are covered by humanitarian response plans (HRP, HNRP, FA, and others) and whether each location is in the GIS catalog. Includes a country-level preparedness table with next scheduled review dates and any overdue flags.

## Data sources

| Source      | Contents                               | Updated via                           |
| ----------- | -------------------------------------- | ------------------------------------- |
| SharePoint  | Work orders, review schedule           | `npm run sync` (copies from OneDrive) |
| ArcGIS      | GIS catalog, COD metadata              | `npm run fetch` (Python scripts)      |
| UN M49      | Country codes and geographic hierarchy | `npm run fetch`                       |
| FTS / other | Humanitarian plans, offices, regions   | `npm run fetch`                       |

## Deployment

Deployed to GitHub Pages. See [CLAUDE.md](CLAUDE.md) for development setup and commands.
