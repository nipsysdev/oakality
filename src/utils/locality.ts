import { ASSETS_DIR, FIND_CMD } from "../constants.ts";
import { getCountryLocalityCount } from "./db-client.ts";
import { extractLocalities } from "./extract.ts";
import { getCountriesToProcess } from "./country.ts";

interface LocalityCount {
  countryCode: string;
  countryName: string;
  dbCount: number;
  fileCount: number;
  isComplete: boolean;
}

async function getPmtilesFileCount(
  countryCode: string,
): Promise<number> {
  try {
    const countryDir = `${ASSETS_DIR}/localities/${countryCode}`;

    const process = new Deno.Command(FIND_CMD, {
      args: [countryDir, "-name", "*.pmtiles", "-type", "f"],
      stdout: "piped",
      stderr: "null",
    });

    const { code, success, stdout } = await process.output();

    if (!success || code !== 0) {
      const entries = Deno.readDirSync(countryDir);
      let count = 0;
      for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith(".pmtiles")) {
          count++;
        }
      }
      return count;
    }

    const output = new TextDecoder().decode(stdout);
    return output.trim() === "" ? 0 : output.trim().split("\n").length;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return 0;
    }
    throw error;
  }
}

async function batchGetPmtilesFileCount(
  countryCodes: string[],
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < countryCodes.length; i += BATCH_SIZE) {
    const batch = countryCodes.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (countryCode) => {
        const count = await getPmtilesFileCount(countryCode);
        return { countryCode, count };
      }),
    );

    batchResults.forEach(({ countryCode, count }) => {
      results.set(countryCode, count);
    });
  }

  return results;
}

export async function ensureAllLocatitiesPresent(): Promise<void> {
  console.log("Checking localities extraction status...");

  const countriesToCheck = await getCountriesToProcess();

  const countryCodes = await import("../../assets/country-codes.json", {
    with: { type: "json" },
  });
  const countryNamesMap = countryCodes.default;

  console.log("Counting pmtiles files...");
  const fileCountMap = await batchGetPmtilesFileCount(countriesToCheck);

  console.log("Querying database for locality counts...");
  const dbCountMap = new Map<string, number>();

  const DB_BATCH_SIZE = 50;
  for (let i = 0; i < countriesToCheck.length; i += DB_BATCH_SIZE) {
    const batch = countriesToCheck.slice(i, i + DB_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (countryCode) => {
        const dbCount = await getCountryLocalityCount(countryCode);
        return { countryCode, dbCount };
      }),
    );

    batchResults.forEach(({ countryCode, dbCount }) => {
      dbCountMap.set(countryCode, dbCount);
    });
  }

  const results: LocalityCount[] = countriesToCheck.map((countryCode) => {
    const countryName =
      countryNamesMap[countryCode as keyof typeof countryNamesMap] ||
      countryCode;
    const dbCount = dbCountMap.get(countryCode) || 0;
    const fileCount = fileCountMap.get(countryCode) || 0;
    const isComplete = dbCount === fileCount;

    return {
      countryCode,
      countryName,
      dbCount,
      fileCount,
      isComplete,
    };
  });

  const allComplete = !results.filter((result) => !result.isComplete).length;

  if (allComplete) {
    console.log("✓ All localities have been extracted!");
    return;
  }

  console.log(
    "Country Code | Country Name                  | DB Count | File Count | Status",
  );
  console.log(
    "-------------|-------------------------------|----------|------------|--------",
  );

  for (const result of results) {
    const status = result.isComplete ? "✓ Complete" : "✗ Incomplete";
    console.log(
      `${result.countryCode.padEnd(12)} | ${result.countryName.padEnd(29)} | ` +
        `${result.dbCount.toString().padEnd(8)} | ${
          result.fileCount.toString().padEnd(10)
        } | ${status}`,
    );
  }

  console.log("✗ Some localities are missing. Extraction is incomplete.");

  console.log("Do you want to extract the missing localities? (y/n)");

  const buf = new Uint8Array(1024);
  const n = <number> await Deno.stdin.read(buf);
  const answer = new TextDecoder().decode(buf.subarray(0, n)).trim();

  if (answer.toLowerCase() === "y") {
    await extractLocalities();
    console.log(
      "Extraction completed.",
    );
  } else {
    console.log(
      "Extraction skipped.",
    );
  }
}
