import { execSync } from "child_process";
import { createWriteStream, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../public/api");
mkdirSync(OUTPUT_DIR, { recursive: true });
const OUTPUT = join(OUTPUT_DIR, "plans.csv");

/** @returns {unknown[]} */
function fetchPlansForYear(/** @type {number} */ year) {
  const url = `https://api.hpc.tools/v2/public/plan?year=${year}&limit=500`;
  // Node's default "node" User-Agent is blocked by the HPC API bot filter;
  // use curl which is on the API's allowlist.
  const stdout = execSync(`curl -sf "${url}"`, { timeout: 30_000, encoding: "utf8" });
  return JSON.parse(stdout).data;
}

const FIRST_YEAR = 2000;

function fetchPlans() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => currentYear - i);
  /** @type {{ iso3: string; year: number; type: string; id: number }[]} */
  const allRows = [];
  for (const year of years) {
    const plans = fetchPlansForYear(year);
    console.log(`${plans.length} plans fetched for ${year}`);
    allRows.push(...buildRows(plans, year));
  }
  return allRows;
}

/** @param {unknown} plan */
function getPlanType(plan) {
  const p = /** @type {any} */ (plan);
  for (const cat of p.categories ?? []) {
    if (cat.group === "planType") return cat.code ?? "";
  }
  return "";
}

/**
 * @param {unknown[]} plans
 * @param {number} year
 */
function buildRows(plans, year) {
  /** @type {{ iso3: string; year: number; type: string; id: number }[]} */
  const rows = [];
  for (const plan of plans) {
    const p = /** @type {any} */ (plan);
    const type = getPlanType(p);
    for (const loc of p.locations ?? []) {
      const iso3 = loc.iso3 ?? "";
      if (iso3) rows.push({ iso3, year, type, id: p.id });
    }
  }
  return rows.sort(
    (a, b) =>
      a.iso3.localeCompare(b.iso3) ||
      a.type.localeCompare(b.type) ||
      String(a.id).localeCompare(String(b.id)),
  );
}

/**
 * @param {{ iso3: string; year: number; type: string; id: number }[]} rows
 * @param {string} path
 */
function writeCsv(rows, path) {
  const fields = /** @type {const} */ (["iso3", "year", "type", "id"]);
  const out = createWriteStream(path);
  out.write(fields.join(",") + "\n");
  for (const row of rows) {
    out.write(fields.map((f) => row[f]).join(",") + "\n");
  }
  out.end();
}

const rows = fetchPlans();
writeCsv(rows, OUTPUT);
console.log(`${rows.length} rows written to ${OUTPUT}`);
