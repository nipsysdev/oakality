import { TARGET_COUNTRIES } from "../constants.ts";

export async function getCountriesToProcess() {
  const countryCodes = await import("../../assets/country-codes.json", {
    with: { type: "json" },
  });

  return TARGET_COUNTRIES.length > 0
    ? TARGET_COUNTRIES
    : Object.keys(countryCodes.default) as string[];
}

export async function getCountryName(countryCode: string) {
  const countryCodes = await import("../../assets/country-codes.json", {
    with: { type: "json" },
  });

  return countryCodes.default[countryCode as keyof typeof countryCodes.default];
}
