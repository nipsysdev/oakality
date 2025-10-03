import { ASSETS_DIR } from "../constants.ts";
import { getLocalities, getLocalitiesCount } from "../utils/db-client.ts";

export interface LocalityInfo {
  id: string;
  name: string;
  country: string;
  placetype: string;
  latitude: number;
  longitude: number;
  fileSize?: number; // In bytes
}

export interface PaginatedLocalitiesResult {
  data: LocalityInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function getFileSize(
  countryCode: string,
  localityId: string,
): Promise<number | undefined> {
  try {
    const filePath =
      `${ASSETS_DIR}/localities/${countryCode}/${localityId}.pmtiles`;
    const fileInfo = await Deno.stat(filePath);
    return fileInfo.size;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return undefined;
    }
    throw error;
  }
}

export async function searchLocalities(
  countryCode: string,
  query?: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedLocalitiesResult> {
  const total = await getLocalitiesCount(countryCode, query);

  const localities = await getLocalities(
    countryCode,
    page,
    limit,
    query,
  );

  const results: LocalityInfo[] = [];
  for (const locality of localities) {
    const fileSize = await getFileSize(countryCode, locality.id);
    results.push({
      ...locality,
      fileSize,
    });
  }

  const totalPages = Math.ceil(total / limit);

  return {
    data: results,
    total,
    page,
    limit,
    totalPages,
  };
}
