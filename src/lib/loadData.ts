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
  gapCount: number;
}

export interface WorkOrderRow {
  iso3: string;
  name_en: string;
  year: string;
  work_order_id: string;
  work_order_status: string;
  plan_type: string;
  change_expected: boolean;
  office_type: string;
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

export interface PlanCountry {
  iso3: string;
  name_en: string;
  regional: string;
  office_type: string;
  plan_types: string[];
  inGis: boolean;
  year_range?: string;
}

export interface PlanGroup {
  key: "current_priority" | "current_other" | "prior_only" | "gis_only" | "m49_only";
  label: string;
  countries: PlanCountry[];
}

export interface ReviewGapRow {
  iso3: string;
  name_en: string;
  year: string;
  plan_type: string;
  office_type: string;
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
  processing: "Processing",
  feedback: "Feedback",
  initialized: "Initialized",
  blocked: "Blocked",
};

const STATUS_ORDER = ["initialized", "processing", "feedback", "published", "blocked"];

function woStatusRank(s: string): number {
  if (s === "initialized") return 0;
  if (s === "processing") return 1;
  if (s === "feedback") return 2;
  if (s === "published") return 3;
  if (s === "blocked") return 4;
  return 5;
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
  const apiDir = join(process.cwd(), "public/api");
  const [reviewText, workText] = ["reviews.csv", "work.csv"].map((f) =>
    readFileSync(join(dataDir, f), "utf-8"),
  );
  const [m49Text, planText, officesText, officeTypesText] = [
    "m49.csv",
    "plans.csv",
    "regions.csv",
    "offices.csv",
  ].map((f) => readFileSync(join(apiDir, f), "utf-8"));

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
  const officeTypes = parseCsv(officeTypesText);

  const m49ByIso3 = Object.fromEntries(
    m49.map((r) => [r.iso_alpha3_code, { ...r, name_en: r.country_or_area }]),
  );
  // Key reviews by "iso3:year" for multi-year support, fall back to iso3 only
  const reviewByKey: Record<string, Record<string, string>> = {};
  for (const r of reviews) {
    reviewByKey[`${r.iso3}:${r.year}`] = r;
    reviewByKey[r.iso3] = r; // fallback (last write wins — fine while all same year)
  }
  const officeByIso3 = Object.fromEntries(offices.map((r) => [r.iso3, r]));
  const officeTypeByIso3 = Object.fromEntries(officeTypes.map((r) => [r.iso3, r.type]));

  // Plans grouped by year → iso3 (HRP and FA only, for plan coverage table)
  const coveragePlanTypes = new Set(["HRP", "HNRP", "FA"]);
  const plansByYear: Record<string, Record<string, { types: string[] }>> = {};
  for (const p of plans) {
    if (!coveragePlanTypes.has(p.type)) continue;
    if (!plansByYear[p.year]) plansByYear[p.year] = {};
    const byIso3 = plansByYear[p.year];
    if (!byIso3[p.iso3]) {
      byIso3[p.iso3] = { types: [p.type] };
    } else {
      if (!byIso3[p.iso3].types.includes(p.type)) byIso3[p.iso3].types.push(p.type);
    }
  }

  // Flat plan lookup by iso3 (all years merged, HRP and FA only) for work order enrichment
  const planByIso3: Record<string, { types: string[] }> = {};
  for (const p of plans) {
    if (!coveragePlanTypes.has(p.type)) continue;
    if (!planByIso3[p.iso3]) {
      planByIso3[p.iso3] = { types: [p.type] };
    } else {
      if (!planByIso3[p.iso3].types.includes(p.type)) planByIso3[p.iso3].types.push(p.type);
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
    const plan = plansByYear[wo.year]?.[wo.iso3];
    return {
      iso3: wo.iso3,
      name_en: geo.name_en ?? wo.iso3,
      year: wo.year,
      work_order_id: wo.id ?? "",
      work_order_status: wo.status ?? "",
      plan_type: plan ? plan.types.map((t) => t.toUpperCase()).join(" / ") : "",
      change_expected: review.change_expected === "TRUE",
      office_type: officeTypeByIso3[wo.iso3] ?? "",
      planned_quarter: wo.planned_quarter ?? "",
      created_date: wo.creation_date ?? "",
      regional: office.regional ?? "",
    };
  }

  const allRows = workOrders.map(buildRow);

  const coveredByWorkOrder = new Set(workOrders.map((wo) => `${wo.iso3}:${wo.year}`));
  const reviewGaps: ReviewGapRow[] = reviews
    .filter((r) => r.change_expected === "TRUE" && !coveredByWorkOrder.has(`${r.iso3}:${r.year}`))
    .map((r) => {
      const geo = m49ByIso3[r.iso3] ?? {};
      const office = officeByIso3[r.iso3] ?? {};
      const plan = plansByYear[r.year]?.[r.iso3];
      return {
        iso3: r.iso3,
        name_en: geo.name_en ?? r.iso3,
        year: r.year,
        plan_type: plan ? plan.types.map((t) => t.toUpperCase()).join(" / ") : "",
        office_type: officeTypeByIso3[r.iso3] ?? "",
        regional: office.regional ?? "",
      };
    })
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  // Review gaps grouped by year for per-section access
  const reviewGapsByYear: Record<string, ReviewGapRow[]> = {};
  for (const r of reviewGaps) {
    if (!reviewGapsByYear[r.year]) reviewGapsByYear[r.year] = [];
    reviewGapsByYear[r.year].push(r);
  }

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
    return {
      year,
      pipeline,
      total: yearRows.length,
      gapCount: (reviewGapsByYear[year] ?? []).length,
    };
  });

  // Backlog: work orders from any year before the latest
  const backlog = allRows
    .filter((r) => r.year !== latestYear)
    .sort(
      (a, b) =>
        (a.planned_quarter || "ZZZZ").localeCompare(b.planned_quarter || "ZZZZ") ||
        woStatusRank(a.work_order_status) - woStatusRank(b.work_order_status),
    );
  const backlogByQuarter = groupByQuarter(backlog);

  // Current cycle: all work orders from the latest year
  const currentCycleWork = allRows
    .filter((r) => r.year === latestYear)
    .sort((a, b) => woStatusRank(a.work_order_status) - woStatusRank(b.work_order_status));
  const currentByQuarter = groupByQuarter(currentCycleWork);

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

  // Load gis.unocha.org catalog country list
  const gisText = readFileSync(join(apiDir, "gis.csv"), "utf-8");
  const gisIso3 = new Set(parseCsv(gisText).map((r) => r.iso3));

  // Build plan groups from the plans data
  const latestPlanYear = [...new Set(plans.map((p) => p.year))].sort().at(-1) ?? "";
  const priorityTypes = new Set(["HRP", "HNRP", "FA"]);

  // iso3 → year → unique types[]
  const plansByIso3 = new Map<string, Map<string, Set<string>>>();
  for (const p of plans) {
    if (!plansByIso3.has(p.iso3)) plansByIso3.set(p.iso3, new Map());
    const byYear = plansByIso3.get(p.iso3)!;
    if (!byYear.has(p.year)) byYear.set(p.year, new Set());
    byYear.get(p.year)!.add(p.type);
  }

  const currentPriority: PlanCountry[] = [];
  const currentOther: PlanCountry[] = [];
  const priorOnly: PlanCountry[] = [];

  for (const [iso3, byYear] of plansByIso3) {
    const geo = m49ByIso3[iso3] ?? {};
    const office = officeByIso3[iso3] ?? {};
    const currentTypes = [...(byYear.get(latestPlanYear) ?? [])];
    const hasPriority = currentTypes.some((t) => priorityTypes.has(t));

    if (currentTypes.length > 0) {
      const country: PlanCountry = {
        iso3,
        name_en: geo.name_en ?? iso3,
        regional: office.regional ?? "",
        office_type: officeTypeByIso3[iso3] ?? "",
        plan_types: currentTypes,
        inGis: gisIso3.has(iso3),
      };
      if (hasPriority) {
        currentPriority.push(country);
      } else {
        currentOther.push(country);
      }
    } else {
      // Has plan in a prior year — use the most recent prior year's types
      const priorYears = [...byYear.keys()].filter((y) => y !== latestPlanYear).sort();
      const priorTypes = [...(byYear.get(priorYears.at(-1)!) ?? [])];
      const minYear = priorYears[0];
      const maxYear = priorYears.at(-1)!;
      const year_range = minYear === maxYear ? minYear : `${minYear}–${maxYear}`;
      priorOnly.push({
        iso3,
        name_en: geo.name_en ?? iso3,
        regional: office.regional ?? "",
        office_type: officeTypeByIso3[iso3] ?? "",
        plan_types: priorTypes,
        inGis: gisIso3.has(iso3),
        year_range,
      });
    }
  }

  const allPlanIso3 = new Set(plansByIso3.keys());
  const gisOnly: PlanCountry[] = [...gisIso3]
    .filter((iso3) => !allPlanIso3.has(iso3))
    .map((iso3) => {
      const geo = m49ByIso3[iso3] ?? {};
      const office = officeByIso3[iso3] ?? {};
      return {
        iso3,
        name_en: geo.name_en ?? iso3,
        regional: office.regional ?? "",
        office_type: officeTypeByIso3[iso3] ?? "",
        plan_types: [],
        inGis: true,
      };
    })
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  const m49Only: PlanCountry[] = Object.entries(m49ByIso3)
    .filter(([iso3]) => !allPlanIso3.has(iso3) && !gisIso3.has(iso3) && iso3 !== "")
    .map(([iso3, geo]) => {
      const office = officeByIso3[iso3] ?? {};
      return {
        iso3,
        name_en: geo.name_en ?? iso3,
        regional: office.regional ?? "",
        office_type: officeTypeByIso3[iso3] ?? "",
        plan_types: [],
        inGis: false,
      };
    })
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  const sort = (arr: PlanCountry[]) => arr.sort((a, b) => a.name_en.localeCompare(b.name_en));
  const planGroups: PlanGroup[] = [
    {
      key: "current_priority",
      label: `${latestPlanYear} — HNRP / FA`,
      countries: sort(currentPriority),
    },
    {
      key: "current_other",
      label: `${latestPlanYear} — Other Plans`,
      countries: sort(currentOther),
    },
    {
      key: "prior_only",
      label: "Prior Year Plans",
      countries: priorOnly.sort((a, b) => {
        const endYear = (c: PlanCountry) => (c.year_range ?? "").split("–").at(-1) ?? "";
        return endYear(b).localeCompare(endYear(a)) || a.iso3.localeCompare(b.iso3);
      }),
    },
    { key: "gis_only", label: "No Plans — gis.unocha.org", countries: gisOnly },
    { key: "m49_only", label: "No Plans — Rest of M49", countries: m49Only },
  ];

  return {
    yearStats,
    latestYear,
    backlog,
    backlogByQuarter,
    currentCycleWork,
    currentByQuarter,
    planCoverageByYear,
    planGroups,
    reviewGaps,
    reviewGapsByYear,
    total: allRows.length,
    syncedAt,
  };
}
