import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "../public/api");
mkdirSync(OUTPUT_DIR, { recursive: true });
const OUTPUT = join(OUTPUT_DIR, "arcgis.csv");

const username = process.env.ARCGIS_USERNAME;
const password = process.env.ARCGIS_PASSWORD;

if (!username || !password) {
  console.error("ARCGIS_USERNAME and ARCGIS_PASSWORD must be set in .env or environment");
  process.exit(1);
}

function curlGet(/** @type {string} */ url) {
  const stdout = execSync(`curl -sf -H "Referer: https://gis.unocha.org" "${url}"`, {
    timeout: 30_000,
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

function getToken() {
  // Pass credentials via env vars so special chars in the password are never
  // interpolated into the shell command string.
  const stdout = execSync(
    `curl -sf -X POST "https://gis.unocha.org/portal/sharing/rest/generateToken"` +
      ` --data-urlencode "username=$ARCGIS_USERNAME"` +
      ` --data-urlencode "password=$ARCGIS_PASSWORD"` +
      ` --data-urlencode "client=referer"` +
      ` --data-urlencode "referer=https://gis.unocha.org"` +
      ` --data-urlencode "f=json"`,
    {
      timeout: 30_000,
      encoding: "utf8",
      env: { ...process.env, ARCGIS_USERNAME: username, ARCGIS_PASSWORD: password },
    },
  );
  const data = JSON.parse(stdout);
  if (data.error) {
    throw new Error(`Token error: ${JSON.stringify(data.error)}`);
  }
  if (!data.token) {
    throw new Error(`No token in response: ${JSON.stringify(data)}`);
  }
  return data.token;
}

function fetchServices(/** @type {string} */ token) {
  const url = `https://gis.unocha.org/server/rest/services/Hosted?f=json&token=${encodeURIComponent(token)}`;
  const data = curlGet(url);
  if (data.error) {
    throw new Error(`Services error: ${JSON.stringify(data.error)}`);
  }
  return /** @type {{ name: string; type: string }[]} */ (data.services ?? []);
}

/** @param {{ name: string; type: string }[]} services */
function extractCountries(services) {
  const iso3Set = new Set();
  const COD_AB_RE = /^(?:Hosted\/)?cod_ab_([a-z]{3})(?:[_-].*)?$/i;
  for (const svc of services) {
    const match = svc.name.match(COD_AB_RE);
    if (match) {
      iso3Set.add(match[1].toUpperCase());
    }
  }
  return [...iso3Set].sort();
}

console.log("Authenticating...");
const token = getToken();
console.log("Fetching service list...");
const services = fetchServices(token);
console.log(`${services.length} services found in Hosted folder`);

const countries = extractCountries(services);
console.log(`\n${countries.length} COD-AB countries:\n`);
for (const iso3 of countries) {
  console.log(iso3);
}

writeFileSync(OUTPUT, "iso3\n" + countries.join("\n") + "\n");
console.log(`\nWritten to ${OUTPUT}`);
