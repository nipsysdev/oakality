import { ASSETS_DIR } from "../constants.ts";

export async function servePmtiles(
  countryCode: string,
  localityId: string,
  rangeHeader?: string,
): Promise<Response | null> {
  try {
    const filePath =
      `${ASSETS_DIR}/localities/${countryCode}/${localityId}.pmtiles`;

    const fileInfo = await Deno.stat(filePath);
    const fileSize = fileInfo.size;

    if (rangeHeader) {
      const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;

        if (start >= 0 && end < fileSize && start <= end) {
          const file = await Deno.open(filePath, { read: true });

          await file.seek(start, Deno.SeekMode.Start);

          const contentLength = end - start + 1;
          const buffer = new Uint8Array(contentLength);
          await file.read(buffer);
          file.close();

          const headers = new Headers();
          headers.set("Content-Type", "application/octet-stream");
          headers.set("Content-Length", contentLength.toString());
          headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
          headers.set("Accept-Ranges", "bytes");

          return new Response(buffer, {
            status: 206,
            headers,
          });
        }
      }
    }

    const file = await Deno.open(filePath, { read: true });

    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Length", fileSize.toString());
    headers.set("Accept-Ranges", "bytes");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${localityId}.pmtiles"`,
    );

    return new Response(file.readable, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
}
