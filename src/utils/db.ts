import process from "node:process";
import { ASSETS_DIR, BZIP2_CMD, WHOSONFIRST_DB_URL } from "../constants.ts";

const DB_FILENAME = `${ASSETS_DIR}/whosonfirst-data-admin-latest.db`;
const COMPRESSED_DB_FILENAME =
  `${ASSETS_DIR}/whosonfirst-data-admin-latest.db.bz2`;

export async function isDatabasePresent(): Promise<boolean> {
  try {
    await Deno.stat(DB_FILENAME);
    return true;
  } catch {
    return false;
  }
}

export async function isCompressedDatabasePresent(): Promise<boolean> {
  try {
    await Deno.stat(COMPRESSED_DB_FILENAME);
    return true;
  } catch {
    return false;
  }
}

export async function downloadDatabase(): Promise<void> {
  console.log("Downloading WhosOnFirst database...");

  const response = await fetch(WHOSONFIRST_DB_URL);
  if (!response.ok) {
    throw new Error(`Failed to download database: ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  const file = await Deno.open(COMPRESSED_DB_FILENAME, {
    create: true,
    write: true,
  });

  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    await file.write(value);
    received += value.length;

    if (total > 0) {
      const percent = Math.round((received / total) * 100);
      process.stdout.write(
        `\rDownload progress: ${percent}% (${received}/${total} bytes)`,
      );
    } else {
      process.stdout.write(`\rDownloaded: ${received} bytes`);
    }
  }

  file.close();
  console.log("Download completed!");
}

export async function decompressDatabase(): Promise<void> {
  console.log("Decompressing database...");

  const process = new Deno.Command(BZIP2_CMD, {
    args: ["-dv", COMPRESSED_DB_FILENAME],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { success, code } = await process.output();

  if (!success) {
    throw new Error(
      `Failed to decompress database. ${BZIP2_CMD} exited with code ${code}`,
    );
  }

  console.log("Database decompressed successfully!");
}

export async function ensureDatabaseIsPresent(): Promise<void> {
  if (await isDatabasePresent()) {
    return;
  }

  if (await isCompressedDatabasePresent()) {
    console.log("Compressed database found, skipping downloading");
    await decompressDatabase();
    return;
  }

  await downloadDatabase();
  await decompressDatabase();
}
