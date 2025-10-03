import { getCountryLocalityCount } from "../utils/db-client.ts";
import { getCountriesToProcess, getCountryName } from "../utils/country.ts";

export interface CountryInfo {
  countryCode: string;
  countryName: string;
  localityCount: number;
}

export async function getCountries(): Promise<CountryInfo[]> {
  const countriesToProcess = await getCountriesToProcess();
  const results: CountryInfo[] = [];

  for (const countryCode of countriesToProcess) {
    const countryName = await getCountryName(countryCode);
    const localityCount = await getCountryLocalityCount(countryCode);

    results.push({
      countryCode,
      countryName,
      localityCount,
    });
  }

  return results;
}
