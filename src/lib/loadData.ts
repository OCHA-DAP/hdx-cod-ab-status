import { readFileSync } from "node:fs";
import { join } from "node:path";

import Papa from "papaparse";

export interface PipelineCount {
  status: string;
  label: string;
  count: number;
}

export interface YearStat {
  year: string;
  pipeline: PipelineCount[];
  total: number;
}

export interface WorkOrderRow {
  iso3: string;
  name_en: string;
  year: string;
  work_order_id: string;
  work_order_status: string;
  plan_type: string;
  admin_level: string;
  change_expected: boolean;
  planned_quarter: string;
  created_date: string;
  regional: string;
}

export interface ScheduleGroup {
  quarter: string;
  rows: WorkOrderRow[];
}

export interface PlanCoverageRow {
  iso3: string;
  name_en: string;
  plan_types: string;
  admin_level: string;
  change_expected: boolean;
  work_order_status: string;
  planned_quarter: string;
  regional: string;
}

export interface PlanCoverageYear {
  year: string;
  rows: PlanCoverageRow[];
  gapCount: number;
}

export interface PreparednessCountry {
  iso3: string;
  name_en: string;
  regional: string;
}

function parseCsv(text: string): Record<string, string>[] {
  return Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  }).data;
}

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  in_progress: "In Progress",
  awaiting_dataset: "Awaiting Dataset",
  on_hold: "On Hold",
};

const STATUS_ORDER = ["published", "in_progress", "awaiting_dataset", "on_hold"];

function woStatusRank(s: string): number {
  if (s === "published") return 0;
  if (s === "in_progress") return 1;
  if (s === "awaiting_dataset") return 2;
  if (s === "on_hold") return 3;
  return 4;
}

function groupByQuarter(rows: WorkOrderRow[]): ScheduleGroup[] {
  const map: Record<string, WorkOrderRow[]> = {};
  for (const r of rows) {
    const key = r.planned_quarter || "TBD";
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return Object.entries(map)
    .sort(([a], [b]) => (a === "TBD" ? 1 : b === "TBD" ? -1 : a.localeCompare(b)))
    .map(([quarter, rows]) => ({ quarter, rows }));
}

export function loadData() {
  const dataDir = join(process.cwd(), "public/data");
  const [m49Text, planText, reviewText, workText, officesText] = [
    "m49.csv",
    "plans.csv",
    "reviews.csv",
    "work.csv",
    "offices.csv",
  ].map((f) => readFileSync(join(dataDir, f), "utf-8"));

  let syncedAt: string | null = null;
  try {
    syncedAt = readFileSync(join(dataDir, "last_synced.txt"), "utf-8").trim();
  } catch {
    // file won't exist until sync-data.sh has been run
  }

  const m49 = parseCsv(m49Text);
  const plans = parseCsv(planText);
  const reviews = parseCsv(reviewText);
  const workOrders = parseCsv(workText);
  const offices = parseCsv(officesText);

  const m49ByIso3 = Object.fromEntries(m49.map((r) => [r.iso3, r]));
  // Key reviews by "iso3:year" for multi-year support, fall back to iso3 only
  const reviewByKey: Record<string, Record<string, string>> = {};
  for (const r of reviews) {
    reviewByKey[`${r.iso3}:${r.year}`] = r;
    reviewByKey[r.iso3] = r; // fallback (last write wins — fine while all same year)
  }
  const officeByIso3 = Object.fromEntries(offices.map((r) => [r.iso3, r]));

  // Plans grouped by year → iso3 (HRP and FA only, for plan coverage table)
  const coveragePlanTypes = new Set(["hrp", "fa"]);
  const plansByYear: Record<string, Record<string, { types: string[]; admin: string }>> = {};
  for (const p of plans) {
    if (!coveragePlanTypes.has(p.type)) continue;
    if (!plansByYear[p.year]) plansByYear[p.year] = {};
    const byIso3 = plansByYear[p.year];
    if (!byIso3[p.iso3]) {
      byIso3[p.iso3] = { types: [p.type], admin: p.admin ?? "" };
    } else {
      if (!byIso3[p.iso3].types.includes(p.type)) byIso3[p.iso3].types.push(p.type);
      if (!byIso3[p.iso3].admin && p.admin) byIso3[p.iso3].admin = p.admin;
    }
  }

  // Flat plan lookup by iso3 (all years merged, HRP and FA only) for work order enrichment
  const planByIso3: Record<string, { types: string[]; admin: string }> = {};
  for (const p of plans) {
    if (!coveragePlanTypes.has(p.type)) continue;
    if (!planByIso3[p.iso3]) {
      planByIso3[p.iso3] = { types: [p.type], admin: p.admin ?? "" };
    } else {
      if (!planByIso3[p.iso3].types.includes(p.type)) planByIso3[p.iso3].types.push(p.type);
      if (!planByIso3[p.iso3].admin && p.admin) planByIso3[p.iso3].admin = p.admin;
    }
  }

  // Most recent work order per iso3+year pair (for plan coverage matching)
  const latestWorkByIso3Year: Record<string, Record<string, string>> = {};
  for (const wo of workOrders) {
    const key = `${wo.iso3}:${wo.year}`;
    const cur = latestWorkByIso3Year[key];
    if (!cur || wo.creation_date > cur.creation_date) latestWorkByIso3Year[key] = wo;
  }

  function buildRow(wo: Record<string, string>): WorkOrderRow {
    const geo = m49ByIso3[wo.iso3] ?? {};
    const review = reviewByKey[`${wo.iso3}:${wo.year}`] ?? reviewByKey[wo.iso3] ?? {};
    const office = officeByIso3[wo.iso3] ?? {};
    const plan = planByIso3[wo.iso3];
    return {
      iso3: wo.iso3,
      name_en: geo.name_en ?? wo.iso3,
      year: wo.year,
      work_order_id: wo.id ?? "",
      work_order_status: wo.status ?? "",
      plan_type: plan ? plan.types.map((t) => t.toUpperCase()).join(" / ") : "",
      admin_level: plan?.admin ?? "",
      change_expected: review.change_expected === "TRUE",
      planned_quarter: wo.planned_quarter ?? "",
      created_date: wo.creation_date ?? "",
      regional: office.regional ?? "",
    };
  }

  const allRows = workOrders.map(buildRow);

  // Determine cycle years (sorted ascending)
  const years = [...new Set(allRows.map((r) => r.year))].sort();
  const latestYear = years[years.length - 1];

  // Per-year pipeline stats
  const yearStats: YearStat[] = years.map((year) => {
    const yearRows = allRows.filter((r) => r.year === year);
    const countMap: Record<string, number> = {};
    for (const r of yearRows)
      countMap[r.work_order_status] = (countMap[r.work_order_status] ?? 0) + 1;
    const pipeline = STATUS_ORDER.filter((s) => countMap[s]).map((s) => ({
      status: s,
      label: STATUS_LABELS[s],
      count: countMap[s],
    }));
    return { year, pipeline, total: yearRows.length };
  });

  // Backlog: non-published work orders from any year before the latest
  const backlog = allRows
    .filter((r) => r.year !== latestYear && r.work_order_status !== "published")
    .sort((a, b) => (a.planned_quarter || "ZZZZ").localeCompare(b.planned_quarter || "ZZZZ"));
  const backlogByQuarter = groupByQuarter(backlog);

  // Current cycle: all work orders from the latest year
  const currentCycleWork = allRows
    .filter((r) => r.year === latestYear)
    .sort((a, b) => woStatusRank(a.work_order_status) - woStatusRank(b.work_order_status));
  const currentByQuarter = groupByQuarter(
    currentCycleWork.filter((r) => r.work_order_status !== "published"),
  );

  // Blocked: all blocked work orders across all years
  const blocked = allRows
    .filter((r) => r.work_order_status === "on_hold" || r.work_order_status === "awaiting_dataset")
    .sort(
      (a, b) =>
        a.year.localeCompare(b.year) ||
        woStatusRank(a.work_order_status) - woStatusRank(b.work_order_status),
    );

  // Plan coverage per year (newest first)
  const planCoverageByYear: PlanCoverageYear[] = Object.entries(plansByYear)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, byIso3]) => {
      const rows: PlanCoverageRow[] = Object.entries(byIso3)
        .map(([iso3, plan]) => {
          const geo = m49ByIso3[iso3] ?? {};
          const review = reviewByKey[`${iso3}:${year}`] ?? reviewByKey[iso3] ?? {};
          const office = officeByIso3[iso3] ?? {};
          const wo = latestWorkByIso3Year[`${iso3}:${year}`];
          return {
            iso3,
            name_en: geo.name_en ?? iso3,
            plan_types: plan.types.map((t) => t.toUpperCase()).join(" / "),
            admin_level: plan.admin ?? "",
            change_expected: review.change_expected === "TRUE",
            work_order_status: wo?.status ?? "",
            planned_quarter: wo?.planned_quarter ?? "",
            regional: office.regional ?? "",
          };
        })
        .sort((a, b) => {
          const typeRank = (t: string) => (t === "hrp" ? 0 : t.includes("hrp") ? 1 : 2);
          const tComp = typeRank(a.plan_types) - typeRank(b.plan_types);
          return tComp !== 0
            ? tComp
            : woStatusRank(a.work_order_status) - woStatusRank(b.work_order_status);
        });
      return {
        year,
        rows,
        gapCount: rows.filter((r) => !r.work_order_status && r.change_expected).length,
      };
    });

  function buildCountryList(type: string): PreparednessCountry[] {
    const seen = new Set<string>();
    return plans
      .filter((r) => r.type === type && !seen.has(r.iso3) && seen.add(r.iso3))
      .map((r) => {
        const geo = m49ByIso3[r.iso3] ?? {};
        const office = officeByIso3[r.iso3] ?? {};
        return {
          iso3: r.iso3,
          name_en: geo.name_en ?? r.iso3,
          regional: office.regional ?? "",
        };
      })
      .sort((a, b) => a.name_en.localeCompare(b.name_en));
  }

  const preparednessCountries = buildCountryList("preparedness");
  const noPlanCountries = buildCountryList("other");

  return {
    yearStats,
    latestYear,
    backlog,
    backlogByQuarter,
    currentCycleWork,
    currentByQuarter,
    blocked,
    planCoverageByYear,
    preparednessCountries,
    noPlanCountries,
    total: allRows.length,
    syncedAt,
  };
}
