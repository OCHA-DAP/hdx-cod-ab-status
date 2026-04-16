import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../public/api/regions.csv");

/** @type {Record<string, string>} hub code → HDX org slug */
const HUBS = {
  ROSEA: "ocha-rosea",
  ROAP: "ocha-roap",
  ROWCA: "ocha-rowca",
  ROLAC: "ocha-rolac",
  ROMENA: "ocha-romena",
};

/**
 * Minimum ratio of (winner datasets / loser datasets) required to resolve a
 * conflict in favour of the dominant hub.  Below this ratio the conflict is
 * left unresolved and the country is excluded from the output.
 */
const CONFLICT_RATIO_THRESHOLD = 2;

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

function curlGet(/** @type {string} */ url) {
  const stdout = execSync(`curl -sf "${url}"`, { timeout: 30_000, encoding: "utf8" });
  return JSON.parse(stdout);
}

// ---------------------------------------------------------------------------
// Source 1: HDX CKAN package_search — regional hubs
//
// For each OCHA regional hub org, find all datasets they've published on HDX
// and collect the unique 3-letter country group codes attached to those datasets.
// ---------------------------------------------------------------------------

function fetchHdxHubs() {
  /** @type {Map<string, string>} iso3 → hub */
  const mapping = new Map();
  /** @type {Map<string, Set<string>>} iso3 → set of hubs (for conflict detection) */
  const allHubs = new Map();

  for (const [hub, orgName] of Object.entries(HUBS)) {
    console.log(`  HDX hubs: querying ${orgName} (${hub})...`);
    let countries;
    try {
      countries = fetchHdxOrgCountries(orgName);
    } catch (/** @type {any} */ err) {
      console.warn(`  HDX: failed for ${orgName}: ${err.message}`);
      continue;
    }
    console.log(`    ${countries.size} countries`);
    for (const iso3 of countries) {
      if (!allHubs.has(iso3)) allHubs.set(iso3, new Set());
      allHubs.get(iso3)?.add(hub);
    }
  }

  // Build final mapping; for countries in multiple hubs, resolve by dataset count
  /** @type {Map<string, { hub: string; counts: Record<string, number> } | null>} */
  const conflictResolutions = new Map();

  for (const [iso3, hubs] of allHubs) {
    if (hubs.size === 1) {
      mapping.set(iso3, [...hubs][0]);
    } else {
      // Fetch per-hub dataset counts to resolve the conflict
      /** @type {Record<string, number>} */
      const counts = {};
      for (const hub of hubs) {
        const orgSlug = HUBS[hub];
        const url =
          `https://data.humdata.org/api/3/action/package_search` +
          `?fq=organization:${orgSlug}+groups:${iso3.toLowerCase()}&rows=0`;
        try {
          const data = curlGet(url);
          counts[hub] = data.result?.count ?? 0;
        } catch {
          counts[hub] = 0;
        }
      }
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
      const [winnerHub, winnerCount] = sorted[0];
      const [, loserCount] = sorted[1];
      if (loserCount === 0 || winnerCount / loserCount >= CONFLICT_RATIO_THRESHOLD) {
        mapping.set(iso3, winnerHub);
        conflictResolutions.set(iso3, { hub: winnerHub, counts });
      } else {
        conflictResolutions.set(iso3, null); // unresolved
      }
    }
  }

  return { mapping, allHubs, conflictResolutions };
}

/** @returns {Set<string>} */
function fetchHdxOrgCountries(/** @type {string} */ orgName) {
  const url =
    `https://data.humdata.org/api/3/action/package_search` +
    `?fq=organization:${encodeURIComponent(orgName)}&rows=1000&fl=groups`;
  const data = curlGet(url);
  if (!data.success) throw new Error("CKAN returned success=false");

  const countries = new Set();
  for (const pkg of data.result?.results ?? []) {
    for (const grp of pkg.groups ?? []) {
      const name = typeof grp === "string" ? grp : (grp?.name ?? "");
      if (name.length === 3 && /^[a-z]+$/i.test(name)) {
        countries.add(name.toUpperCase());
      }
    }
  }
  return countries;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * @param {Map<string, Set<string>>} allHubs
 * @param {Map<string, { hub: string; counts: Record<string, number> } | null>} conflictResolutions
 */
function printAnalysis(allHubs, conflictResolutions) {
  console.log("\n=== HDX CKAN (hub → country datasets) ===");
  for (const [hub] of Object.entries(HUBS)) {
    const countries = [...allHubs.entries()]
      .filter(([, hubs]) => hubs.has(hub))
      .map(([iso3]) => iso3)
      .sort();
    console.log(`  ${hub}: ${countries.join(" ")} (${countries.length})`);
  }

  if (conflictResolutions.size) {
    console.log(`\n  Conflict resolution (country claimed by multiple hubs):`);
    for (const [iso3, resolution] of conflictResolutions) {
      const hubs = allHubs.get(iso3) ?? new Set();
      if (resolution) {
        const countsStr = Object.entries(resolution.counts)
          .map(([h, n]) => `${h}:${n}`)
          .join(", ");
        console.log(
          `    ${iso3}: ${[...hubs].join(" + ")} → assigned to ${resolution.hub} (${countsStr})`,
        );
      } else {
        console.log(
          `    ${iso3}: ${[...hubs].join(" + ")} → unresolved (too close), excluded from output`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Write CSV
// ---------------------------------------------------------------------------

/** @param {Map<string, string>} hubMapping */
function writeCsv(hubMapping) {
  const rows = [...hubMapping.keys()].sort();
  const csv =
    "iso3,regional\n" + rows.map((iso3) => `${iso3},${hubMapping.get(iso3)}`).join("\n") + "\n";
  writeFileSync(OUTPUT, csv, "utf8");
  console.log(`\nWrote ${rows.length} rows → ${OUTPUT}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("Fetching HDX CKAN hub data...");
const { mapping: hdxMapping, allHubs, conflictResolutions } = fetchHdxHubs();

printAnalysis(allHubs, conflictResolutions);

writeCsv(hdxMapping);
