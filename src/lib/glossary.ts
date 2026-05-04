export interface GlossaryEntry {
  label: string;
  definition: string;
}

export const GLOSSARY = {
  "cod-ab": {
    label: "COD-AB",
    definition:
      "Common Operational Dataset for Administrative Boundaries — OCHA's authoritative reference layer for a country's official admin subdivisions (country, province, district, etc.), used across humanitarian response.",
  },
  cod: {
    label: "COD",
    definition:
      "Common Operational Datasets — authoritative reference data used by humanitarian responders for emergency coordination.",
  },
  hdx: {
    label: "HDX",
    definition: "Humanitarian Data Exchange — OCHA's open platform for sharing humanitarian data.",
  },
  iso3: {
    label: "ISO3",
    definition: "ISO 3166-1 alpha-3 three-letter country code (e.g. SYR = Syrian Arab Republic).",
  },
  m49: {
    label: "M49",
    definition:
      "UN Statistics Division standard codes for countries and regions; used here to align country lists across data sources.",
  },
  arcgis: {
    label: "ArcGIS",
    definition: "Esri's GIS platform where OCHA publishes the COD-AB catalog of admin boundaries.",
  },

  hrp: {
    label: "HRP",
    definition: "Humanitarian Response Plan — country-level coordinated humanitarian appeal.",
  },
  hnrp: {
    label: "HNRP",
    definition:
      "Humanitarian Needs and Response Plan — combined needs + response document, the newer format that replaces separate HNO and HRP plans.",
  },
  fa: {
    label: "Flash Appeal",
    definition: "Flash Appeal — short-term emergency appeal for sudden-onset crises.",
  },
  reg: {
    label: "Regional Plan",
    definition:
      "Regional Refugee Response Plan — multi-country plan addressing refugee outflows from a shared crisis.",
  },
  "other-plans": {
    label: "Other Plans",
    definition: "Active humanitarian plans that are not an HRP or Flash Appeal.",
  },
  "prior-plans": {
    label: "Prior Plans",
    definition:
      "Locations covered by humanitarian plans in earlier years but not the current cycle.",
  },
  "no-plans": {
    label: "No Plans",
    definition: "Locations with no active humanitarian plan in the current or recent cycles.",
  },

  co: {
    label: "CO",
    definition: "Country Office — OCHA office in a specific country.",
  },
  hat: {
    label: "HAT",
    definition:
      "Humanitarian Advisory Team — smaller OCHA presence advising on humanitarian coordination, typically embedded in a UN Resident Coordinator's office.",
  },
  ro: {
    label: "RO",
    definition: "Regional Office — OCHA office covering multiple countries in a region.",
  },
  "office-type": {
    label: "Office Type",
    definition:
      "Whether the location is served by a Country Office (CO), Humanitarian Advisory Team (HAT), or Regional Office (RO).",
  },
  "regional-office": {
    label: "Regional Office",
    definition: "The OCHA regional office responsible for the location.",
  },

  "work-order": {
    label: "Work Order",
    definition: "A tracked task to update or create a country's COD-AB dataset.",
  },
  pipeline: {
    label: "Pipeline",
    definition:
      "End-to-end flow of a work order from Backlog through Done — the sequence of statuses a work order passes through.",
  },
  cycle: {
    label: "Cycle",
    definition: "A calendar-year batch of planned work orders.",
  },
  "current-cycle": {
    label: "Current cycle",
    definition: "The most recent year of work orders being actively managed.",
  },
  backlog: {
    label: "Backlog",
    definition: "Incomplete work orders carried over from prior cycles.",
  },
  selected: {
    label: "Selected for Development",
    definition: "Work order has been opened and is queued for work.",
  },
  "planned-quarter": {
    label: "Planned Quarter",
    definition: "The quarter (Q1–Q4) in which the work order is targeted to complete.",
  },
  "open-for": {
    label: "Open For",
    definition: "How long the work order has been in progress since it was created.",
  },
  "major-minor": {
    label: "Major / Minor",
    definition:
      "Whether the update is substantive (Major, ●) — e.g. boundaries or codes change materially — or cosmetic (Minor, ○) — e.g. metadata or formatting corrections.",
  },
  "plan-type": {
    label: "Plan Type",
    definition:
      "Type of humanitarian plan active for the location: HRP (Humanitarian Response Plan), HNRP (Humanitarian Needs and Response Plan), FA (Flash Appeal), or REG (Regional Refugee Response Plan).",
  },

  "status-backlog": {
    label: "Backlog",
    definition:
      "Location is expected to need a boundary update this cycle, but no work order has been opened yet.",
  },
  "status-selected": {
    label: "Selected for Development",
    definition: "Work order has been opened and is queued; work has not begun yet.",
  },
  "status-in_progress": {
    label: "In Progress",
    definition: "Work is actively underway on the boundaries.",
  },
  "status-blocked": {
    label: "Blocked",
    definition: "Work is paused awaiting feedback or unblocking from stakeholders.",
  },
  "status-done": {
    label: "Done",
    definition: "Boundaries have been finalized and are available in the ArcGIS catalog.",
  },
  "status-cancelled": {
    label: "Cancelled",
    definition: "Work order has been cancelled and will not be completed.",
  },

  "in-gis": {
    label: "In GIS",
    definition: "Country whose admin boundaries are published in OCHA's ArcGIS catalog.",
  },
  "next-review": {
    label: "Next Review",
    definition:
      "Date the next data review or update is due, computed from COD metadata and update frequency.",
  },
  "plan-coverage": {
    label: "Plan Coverage",
    definition: "Locations covered by HRP or Flash Appeal plans in a given year.",
  },
  "hnrp-fa": {
    label: "HNRP / FA",
    definition:
      "Locations with an active Humanitarian Needs and Response Plan (HNRP) or Flash Appeal (FA) for the current cycle — the priority group for boundary readiness.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type TermSlug = keyof typeof GLOSSARY;
