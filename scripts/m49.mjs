import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "../public/api");
mkdirSync(OUTPUT_DIR, { recursive: true });
const OUTPUT = join(OUTPUT_DIR, "m49.csv");

const URL = "https://unstats.un.org/unsd/methodology/m49/overview/";
const TABLE_ID = "downloadTableEN";

console.log(`Fetching ${URL} ...`);
const res = await fetch(URL, {
  headers: { "User-Agent": "Mozilla/5.0" },
});
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
const html = await res.text();

// Extract the target table's HTML
const tableRe = new RegExp(`<table[^>]*id\\s*=\\s*"${TABLE_ID}"[^>]*>([\\s\\S]*?)</table>`, "i");
const tableMatch = html.match(tableRe);
if (!tableMatch) throw new Error(`Table #${TABLE_ID} not found in page`);
const tableHtml = tableMatch[0];

// Parse rows and cells
const rows = [];
for (const rowMatch of tableHtml.matchAll(/<tr[\s>]([\s\S]*?)<\/tr>/gi)) {
  const cells = [];
  for (const cellMatch of rowMatch[1].matchAll(/<t[dh][\s>]([\s\S]*?)<\/t[dh]>/gi)) {
    // Strip inner tags and decode basic HTML entities
    const text = cellMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .trim();
    cells.push(text);
  }
  if (cells.length) rows.push(cells);
}

if (rows.length < 2) throw new Error(`Only ${rows.length} rows parsed — check the HTML structure`);

// Convert header row to snake_case
rows[0] = rows[0].map((h) =>
  h
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, ""),
);

// Serialize to CSV
function csvRow(/** @type {string[]} */ cells) {
  return cells
    .map((/** @type {string} */ c) =>
      c.includes(",") || c.includes('"') || c.includes("\n") ? `"${c.replace(/"/g, '""')}"` : c,
    )
    .join(",");
}

const csv = rows.map(csvRow).join("\n") + "\n";
writeFileSync(OUTPUT, csv, "utf8");
console.log(`Wrote ${rows.length - 1} rows → ${OUTPUT}`);
