import { ASSETS_DIR, FIND_CMD } from "../constants.ts";
import { getCountryLocalityCount } from "./db-client.ts";
import { extractLocalities } from "./extract.ts";
import { getCountriesToProcess, getCountryName } from "./country.ts";

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

export async function ensureAllLocatitiesPresent(): Promise<void> {
  console.log("Checking localities extraction status...");

  const results: LocalityCount[] = [];

  const countriesToCheck = await getCountriesToProcess();

  for (const countryCode of countriesToCheck) {
    const countryName = await getCountryName(countryCode);
    const dbCount = await getCountryLocalityCount(countryCode);
    const fileCount = await getPmtilesFileCount(countryCode);
    const isComplete = dbCount > 0 && dbCount === fileCount;

    results.push({
      countryCode,
      countryName,
      dbCount,
      fileCount,
      isComplete,
    });
  }

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
