import countryCodes from "../assets/country-codes.json" with { type: "json" };

export type CountryCode = keyof typeof countryCodes;

export const PORT = 3000;
export const ASSETS_DIR = "assets";
export const PMTILES_CMD = "pmtiles";
export const BZIP2_CMD = "bzip2";
export const FIND_CMD = "find";
export const WHOSONFIRST_DB_URL =
  "https://data.geocode.earth/wof/dist/sqlite/whosonfirst-data-admin-latest.db.bz2";
export const PROTOMAPS_BUILDS_URL =
  "https://build-metadata.protomaps.dev/builds.json";
export const TARGET_COUNTRIES: CountryCode[] = []; // empty array = ALL
