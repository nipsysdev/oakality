import { Database } from "@db/sqlite";
import { ASSETS_DIR } from "../constants.ts";

export interface Locality {
  id: string;
  name: string;
  country: string;
  placetype: string;
  latitude: number;
  longitude: number;
  min_longitude: number;
  min_latitude: number;
  max_longitude: number;
  max_latitude: number;
}

export interface LocalityWithBounds {
  id: string;
  country: string;
  min_longitude: number;
  min_latitude: number;
  max_longitude: number;
  max_latitude: number;
}

const dbPath = `${ASSETS_DIR}/whosonfirst-data-admin-latest.db`;
const db = new Database(dbPath);

export function closeDatabase(): void {
  db.close();
}

function executeAsync<T>(operation: () => T): Promise<T> {
  return Promise.resolve().then(operation);
}

function buildBaseQuery(
  includeCountryFilter = true,
  includeNameFilter = false,
): { sql: string; params: string[] } {
  const conditions = [
    "placetype = 'locality'",
    "is_current = 1",
    "is_deprecated = 0",
    "name IS NOT NULL",
    "name != ''",
    "latitude IS NOT NULL",
    "longitude IS NOT NULL",
    "min_longitude IS NOT NULL",
    "min_latitude IS NOT NULL",
    "max_longitude IS NOT NULL",
    "max_latitude IS NOT NULL",
  ];

  const params: string[] = [];

  if (includeCountryFilter) {
    conditions.push("country == ?");
    params.push("?");
  }

  if (includeNameFilter) {
    conditions.push("name LIKE ?");
    params.push("?");
  }

  const sql = `FROM spr WHERE ${conditions.join(" AND ")}`;
  return { sql, params };
}

export async function getLocalitiesCount(
  countryCode: string,
  query?: string,
): Promise<number> {
  const { sql: baseSql } = buildBaseQuery(true, !!query);

  const sql = `SELECT COUNT(*) as count ${baseSql}`;
  const params: (string | number)[] = [countryCode];

  if (query && query.trim() !== "") {
    const likePattern = `${query}%`;
    params.push(likePattern);
  }

  return await executeAsync(() => {
    const stmt = db.prepare(sql);
    const result = stmt.value<[number]>(params);
    return result ? result[0] : 0;
  });
}

export async function getLocalities(
  countryCode: string,
  page: number = 1,
  limit: number = 20,
  query?: string,
): Promise<Locality[]> {
  const { sql: baseSql } = buildBaseQuery(true, !!query);

  let sql = `
    SELECT
      id,
      name,
      country,
      placetype,
      latitude,
      longitude
    ${baseSql}
  `;

  const params: (string | number)[] = [countryCode];

  if (query && query.trim() !== "") {
    const likePattern = `${query}%`;
    params.push(likePattern);
  }

  sql += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
  const offset = (page - 1) * limit;
  params.push(limit.toString(), offset.toString());

  return await executeAsync(() => {
    const stmt = db.prepare(sql);
    const localities: Locality[] = [];

    for (const row of stmt.iter(params)) {
      localities.push(row as Locality);
    }

    return localities;
  });
}

export async function getLocalitiesWithBounds(): Promise<LocalityWithBounds[]> {
  const { sql: baseSql } = buildBaseQuery(false, false);

  const sql = `
    SELECT id, country, min_longitude, min_latitude, max_longitude, max_latitude
    ${baseSql}
    AND country IS NOT NULL
    AND country != ''
    ORDER BY country
  `;

  return await executeAsync(() => {
    const stmt = db.prepare(sql);
    const localities: LocalityWithBounds[] = [];

    for (const row of stmt.iter()) {
      localities.push(row as LocalityWithBounds);
    }

    return localities;
  });
}

export async function getCountryLocalityCount(
  countryCode: string,
): Promise<number> {
  const { sql: baseSql } = buildBaseQuery(true, false);

  const sql = `SELECT COUNT(*) as count ${baseSql}`;

  return await executeAsync(() => {
    const stmt = db.prepare(sql);
    const result = stmt.value<[number]>([countryCode]);
    return result ? result[0] : 0;
  });
}
