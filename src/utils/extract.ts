import { ASSETS_DIR, PMTILES_CMD, PROTOMAPS_BUILDS_URL } from "../constants.ts";
import { getLocalitiesWithBounds, LocalityWithBounds } from "./db-client.ts";
import { getCountriesToProcess } from "./country.ts";

interface Build {
  key: string;
  size: number;
  md5sum: string;
  b3sum: string;
  uploaded: string;
  version: string;
}

async function getLatestPlanetPmtilesUrl(): Promise<string> {
  console.log("Fetching latest planet pmtiles URL...");

  const response = await fetch(PROTOMAPS_BUILDS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch builds: ${response.statusText}`);
  }

  const builds: Build[] = await response.json();

  if (builds.length === 0) {
    throw new Error("No builds found");
  }

  const latestBuild = builds
    .sort((a, b) =>
      new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime()
    )[0];

  const url = `https://build.protomaps.com/${latestBuild.key}`;
  console.log(`Latest planet pmtiles URL: ${url}`);

  return url;
}

async function extractLocality(
  locality: LocalityWithBounds,
  planetPmtilesUrl: string,
  countryDir: string,
): Promise<void> {
  const outputFile = `${countryDir}/${locality.id}.pmtiles`;

  try {
    await Deno.stat(outputFile);
    console.log(`Skipping existing: ${locality.id} (${locality.country})`);
    return;
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  const bbox =
    `${locality.min_longitude},${locality.min_latitude},${locality.max_longitude},${locality.max_latitude}`;
  console.log(`Extracting: ${locality.id} (${locality.country}) [${bbox}]`);

  const process = new Deno.Command(PMTILES_CMD, {
    args: [
      "extract",
      planetPmtilesUrl,
      outputFile,
      `--bbox=${bbox}`,
    ],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { success, code } = await process.output();

  if (!success) {
    console.error(
      `Failed to extract ${locality.id}. ${PMTILES_CMD} exited with code ${code}`,
    );
  }
}

const MAX_CONCURRENT_EXTRACTIONS = 10;

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

export async function extractLocalities(): Promise<void> {
  console.log("Starting localities extraction...");

  const planetPmtilesUrl = await getLatestPlanetPmtilesUrl();

  const localities = await getLocalitiesWithBounds();

  const countriesToProcess = await getCountriesToProcess();

  for (const countryCode of countriesToProcess) {
    const countryLocalities = localities.filter((loc) =>
      loc.country === countryCode
    );

    if (countryLocalities.length === 0) {
      console.log(`No localities found for ${countryCode}`);
      continue;
    }

    const countryDir = `${ASSETS_DIR}/localities/${countryCode}`;
    await Deno.mkdir(countryDir, { recursive: true });

    console.log(
      `Processing ${countryLocalities.length} localities for ${countryCode}...`,
    );

    await processBatch(
      countryLocalities,
      (locality) => extractLocality(locality, planetPmtilesUrl, countryDir),
      MAX_CONCURRENT_EXTRACTIONS,
    );
  }
}
