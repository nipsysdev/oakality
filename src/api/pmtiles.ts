import { ASSETS_DIR } from "../constants.ts";

export async function servePmtiles(
  countryCode: string,
  localityId: string,
): Promise<Response | null> {
  try {
    const filePath =
      `${ASSETS_DIR}/localities/${countryCode}/${localityId}.pmtiles`;

    const fileInfo = await Deno.stat(filePath);
    const file = await Deno.open(filePath, { read: true });

    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Length", fileInfo.size.toString());
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
