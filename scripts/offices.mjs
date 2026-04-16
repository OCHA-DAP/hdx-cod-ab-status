/**
 * offices.mjs
 *
 * Fetches OCHA country offices (CO) and humanitarian advisory teams (HAT)
 * from the OCHA PowerBI dashboard and writes public/api/offices.csv.
 *
 * Output CSV columns:  iso3, type   (type is "CO" or "HAT")
 *
 * Also verifies the CO list against the Jan 2026 OCHA org chart PDF.
 *
 * Usage:
 *   node scripts/offices.mjs
 *
 * Requires: public/api/m49.csv (run m49.mjs first if missing)
 *
 * Dashboard: https://app.powerbi.com/view?r=eyJrIjoiZTNmYjk4ZDUtZDFlYi00MzllLTk5YTAtY2NiNTQ5MmRmZWY0IiwidCI6IjBmOWUzNWRiLTU0NGYtNGY2MC1iZGNjLTVlYTQxNmU2ZGM3MCIsImMiOjh9
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_CSV = join(__dirname, "../public/api/offices.csv");
const M49_CSV = join(__dirname, "../public/api/m49.csv");

// ---------------------------------------------------------------------------
// PowerBI embed parameters (decoded from the dashboard embed URL).
// The APIM host is derived from the cluster URI by stripping "-redirect"
// and appending "-api" to the first hostname segment (PowerBI getAPIMUrl logic).
// Cluster: https://wabi-north-europe-j-primary-redirect.analysis.windows.net
// APIM:    https://wabi-north-europe-j-primary-api.analysis.windows.net
// ---------------------------------------------------------------------------
const RESOURCE_KEY = "e3fb98d5-d1eb-439e-99a0-ccb5492dfef4";
const APIM = "https://wabi-north-europe-j-primary-api.analysis.windows.net";
const MODEL_ID = 156451; // from conceptualschema response

// ---------------------------------------------------------------------------
// Country offices confirmed in the Jan 2026 OCHA org chart PDF.
// Used for verification only.
// ---------------------------------------------------------------------------
const PDF_CO_ISO3 = new Set([
  "AFG",
  "BFA",
  "CMR",
  "CAF",
  "TCD",
  "COL",
  "COD",
  "ERI",
  "ETH",
  "HTI",
  "LBN",
  "MLI",
  "MOZ",
  "MMR",
  "NER",
  "NGA",
  "PSE",
  "PAK",
  "SOM",
  "SSD",
  "SDN",
  "SYR",
  "TUR",
  "UKR",
  "VEN",
  "YEM",
]);

// ---------------------------------------------------------------------------
// Name → ISO3 overrides for entries where the dashboard label differs from
// M49, or where the ISO column in the dashboard is null/missing.
// ---------------------------------------------------------------------------
const NAME_OVERRIDES = /** @type {Record<string, string>} */ ({
  // CO table
  opt: "PSE", // "Occupied Palestinian Territory"
  "occupied palestinian territory": "PSE",
  "state of palestine": "PSE",
  turkiye: "TUR",
  türkiye: "TUR",
  turkey: "TUR",
  "syrian arab republic": "SYR",
  syria: "SYR",
  "venezuela (bolivarian republic of)": "VEN",
  "dr congo": "COD",
  "dr of the congo": "COD",
  "democratic republic of the congo": "COD",
  // HAT table
  guatemala: "GTM",
  iran: "IRN",
  dprk: "PRK", // M49: "Democratic People's Republic of Korea"
});

// ---------------------------------------------------------------------------
// Entries to skip entirely (not sovereign countries).
// ---------------------------------------------------------------------------
const SKIP_NAMES = new Set(["office for the pacific (suva)", "asean", "aulo"]);

// ---------------------------------------------------------------------------
// Build lowercase-name → ISO3 lookup from M49 CSV.
// ---------------------------------------------------------------------------
function buildM49Lookup() {
  let csv;
  try {
    csv = readFileSync(M49_CSV, "utf8");
  } catch {
    console.warn("  M49 CSV not found — run `npm run m49` first");
    return new Map();
  }
  /** @type {Map<string, string>} */
  const lookup = new Map();
  const lines = csv.trim().split("\n");
  const header = lines[0].split(",");
  const nameIdx = header.indexOf("country_or_area");
  const iso3Idx = header.indexOf("iso_alpha3_code");
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const name = cols[nameIdx]?.toLowerCase().trim() ?? "";
    const iso3 = cols[iso3Idx]?.trim() ?? "";
    if (name && iso3) lookup.set(name, iso3);
  }
  return lookup;
}

// ---------------------------------------------------------------------------
// curl helper — uses --compressed for gzip responses.
// ---------------------------------------------------------------------------
function curlPost(url, body) {
  const escaped = JSON.stringify(body).replace(/'/g, "'\\''");
  const cmd = [
    "curl -sf --compressed --max-time 20",
    `-H "X-PowerBI-ResourceKey: ${RESOURCE_KEY}"`,
    `-H "Content-Type: application/json"`,
    `-H "Accept: application/json"`,
    `-X POST -d '${escaped}'`,
    `"${url}"`,
  ].join(" ");
  return execSync(cmd, { timeout: 30_000, encoding: "utf8" });
}

// ---------------------------------------------------------------------------
// PowerBI DSR decoder.
//
// Each row in DM0 can have:
//   S   — schema definition (skip as data row)
//   C   — array of new values (indices into ValueDicts)
//   R   — bitmask: bit i set = repeat column i from previous row
//   Ø   — bitmask: bit i set = column i is null (no C slot consumed)
//
// For each column i:
//   if R & (1<<i) → use prev[i]
//   else if Ø & (1<<i) → null
//   else → C[ci++]
// ---------------------------------------------------------------------------
/**
 * @param {any[]} dmRows
 * @param {{ [key: string]: any[] }} dicts
 * @param {number} numCols
 * @returns {(string | null)[][]}
 */
function decodeDsr(dmRows, dicts, numCols) {
  const prev = Array(numCols).fill(null);
  const results = [];

  for (const row of dmRows) {
    // "S" marks a schema definition; the same row may also carry the first data
    // values in "C", so we skip only when C is absent or empty.
    if ("S" in row && (!row.C || row.C.length === 0)) continue;

    const R = row.R ?? 0;
    const O = row["Ø"] ?? 0;
    const c = row.C ?? [];

    const vals = [];
    let ci = 0;
    for (let i = 0; i < numCols; i++) {
      if (R & (1 << i)) {
        vals.push(prev[i]);
      } else if (O & (1 << i)) {
        vals.push(null);
      } else {
        vals.push(ci < c.length ? c[ci] : null);
        ci++;
      }
    }

    prev.splice(0, numCols, ...vals);

    // Resolve dict indices to string values
    const resolved = vals.map((v, i) => {
      const dictKey = `D${i}`;
      const dict = dicts[dictKey];
      if (dict && typeof v === "number") return dict[v] ?? null;
      return v;
    });

    results.push(resolved);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Resolve a country name to ISO3.
// ---------------------------------------------------------------------------
/**
 * @param {string} name
 * @param {Map<string, string>} m49
 * @returns {string | null}
 */
function resolveIso3(name, m49) {
  const lower = name.toLowerCase().trim();
  if (Object.hasOwn(NAME_OVERRIDES, lower)) return NAME_OVERRIDES[lower];
  if (m49.has(lower)) return /** @type {string} */ (m49.get(lower));
  // Partial match: every word in the display name appears in an M49 name
  const words = lower.split(/\s+/);
  for (const [m49Name, iso3] of m49) {
    if (words.every((w) => m49Name.includes(w))) return iso3;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Query one PowerBI table and return decoded rows.
// ---------------------------------------------------------------------------
/**
 * @param {string} table
 * @param {string[]} columns
 * @returns {(string | null)[][]}
 */
function queryTable(table, columns) {
  const url = `${APIM}/public/reports/querydata?preferReadOnlySession=true`;

  const select = columns.map((col) => ({
    Column: {
      Expression: { SourceRef: { Source: "t" } },
      Property: col,
    },
    Name: col,
  }));

  const projections = columns.map((_, i) => i);

  const body = {
    queries: [
      {
        Query: {
          Commands: [
            {
              SemanticQueryDataShapeCommand: {
                Query: {
                  Version: 2,
                  From: [{ Name: "t", Entity: table, Type: 0 }],
                  Select: select,
                },
                Binding: {
                  Primary: { Groupings: [{ Projections: projections }] },
                  DataReduction: {
                    DataVolume: 4,
                    Primary: { Window: { Count: 500 } },
                  },
                  Version: 1,
                },
              },
            },
          ],
        },
      },
    ],
    cancelQueries: [],
    modelId: MODEL_ID,
  };

  let raw;
  try {
    raw = curlPost(url, body);
  } catch (/** @type {any} */ err) {
    throw new Error(`querydata failed for "${table}": ${err.message}`, { cause: err });
  }

  /** @type {any} */
  const data = JSON.parse(raw);
  const ds = data?.results?.[0]?.result?.data?.dsr?.DS?.[0];
  if (!ds) throw new Error(`Unexpected querydata response for "${table}"`);

  const dmRows = ds?.PH?.[0]?.DM0 ?? [];
  const dicts = ds?.ValueDicts ?? {};
  return decodeDsr(dmRows, dicts, columns.length);
}

// ---------------------------------------------------------------------------
// Verify COs against the PDF list.
// ---------------------------------------------------------------------------
/**
 * @param {Set<string>} coIso3
 */
function verifyAgainstPdf(coIso3) {
  const matched = [...PDF_CO_ISO3].filter((iso3) => coIso3.has(iso3)).sort();
  const pdfOnly = [...PDF_CO_ISO3].filter((iso3) => !coIso3.has(iso3)).sort();
  const powerBiOnly = [...coIso3].filter((iso3) => !PDF_CO_ISO3.has(iso3)).sort();

  console.log("\n=== Verification vs Jan 2026 PDF org chart ===");
  console.log(
    `  Match    (${matched.length}/${PDF_CO_ISO3.size}): ${matched.join(" ") || "(none)"}`,
  );
  if (pdfOnly.length) {
    console.warn(`  PDF only (${pdfOnly.length}): ${pdfOnly.join(" ")}  ← missing from PowerBI`);
  }
  if (powerBiOnly.length) {
    console.log(
      `  PBI only (${powerBiOnly.length}): ${powerBiOnly.join(" ")}  ← not in PDF (new offices?)`,
    );
  }
  if (!pdfOnly.length && !powerBiOnly.length) {
    console.log("  CO lists match exactly.");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const m49 = buildM49Lookup();
console.log(`M49 lookup: ${m49.size} entries`);

/** @type {Map<string, string>} iso3 → type */
const resultMap = new Map();
const unmatched = /** @type {{ name: string; type: string }[]} */ ([]);

// ── 1. Country Offices ────────────────────────────────────────────────────
console.log('\n[1] Querying "CO HOO CONTACT LIST" for country offices...');
const coRows = queryTable("CO HOO CONTACT LIST", ["COUNTRY", "OFFICE TYPE"]);

for (const [country, officeType] of coRows) {
  if (!country) continue;
  const lower = country.toLowerCase().trim();
  if (SKIP_NAMES.has(lower)) {
    console.log(`  Skipping: ${country}`);
    continue;
  }
  // Dashboard only has "Country Office" in this table, but normalise anyway
  const type = officeType?.toLowerCase().includes("country") ? "CO" : "CO";

  // Try ISO from name
  const iso3 = resolveIso3(country, m49);
  if (!iso3) {
    unmatched.push({ name: country, type });
    console.warn(`  Unmatched: ${country}`);
    continue;
  }
  resultMap.set(iso3, type);
  console.log(`  ${country} → ${iso3} [${type}]`);
}

// ── 2. Humanitarian Advisory Teams ────────────────────────────────────────
console.log('\n[2] Querying "RO_HAT HOO CONTACT LIST" for HATs...');
const hatRows = queryTable("RO_HAT HOO CONTACT LIST", ["COUNTRY", "OFFICE TYPE"]);

for (const [country, officeType] of hatRows) {
  if (!country || !officeType) continue;
  const lower = country.toLowerCase().trim();
  if (SKIP_NAMES.has(lower)) {
    console.log(`  Skipping: ${country}`);
    continue;
  }
  // Only include Humanitarian Advisor Teams; skip Regional Offices and Liaison Offices
  if (!officeType.toLowerCase().includes("humanitarian")) {
    console.log(`  Skipping (${officeType}): ${country}`);
    continue;
  }

  const iso3 = resolveIso3(country, m49);
  if (!iso3) {
    unmatched.push({ name: country, type: "HAT" });
    console.warn(`  Unmatched: ${country}`);
    continue;
  }
  // Don't overwrite a CO with HAT
  if (!resultMap.has(iso3)) {
    resultMap.set(iso3, "HAT");
    console.log(`  ${country} → ${iso3} [HAT]`);
  }
}

// ── 3. Write CSV ──────────────────────────────────────────────────────────
const sorted = [...resultMap.entries()].sort(([a], [b]) => a.localeCompare(b));
const csv = "iso3,type\n" + sorted.map(([iso3, type]) => `${iso3},${type}`).join("\n") + "\n";
writeFileSync(OUTPUT_CSV, csv, "utf8");

const coCount = sorted.filter(([, t]) => t === "CO").length;
const hatCount = sorted.filter(([, t]) => t === "HAT").length;
console.log(`\nWrote ${sorted.length} rows → ${OUTPUT_CSV}`);
console.log(`  CO:  ${coCount}`);
console.log(`  HAT: ${hatCount}`);

if (unmatched.length) {
  console.warn(
    `\nWarning: ${unmatched.length} name(s) could not be resolved to ISO3` +
      ` (add to NAME_OVERRIDES):\n` +
      unmatched.map((u) => `  "${u.name}" [${u.type}]`).join("\n"),
  );
}

// ── 4. Verify COs vs PDF ──────────────────────────────────────────────────
const coIso3 = new Set(sorted.filter(([, t]) => t === "CO").map(([iso3]) => iso3));
verifyAgainstPdf(coIso3);
