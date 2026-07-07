import Country from './countery.model';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Resolves a user-supplied country/city string against the canonical
 * Country collection so saved values use consistent casing/spacing
 * regardless of how (or when) they were entered. Falls back to the
 * trimmed input when there is no canonical match (e.g. custom/unlisted
 * cities), so nothing is lost for genuinely new locations.
 */
export const resolveCanonicalLocation = async (
  countryName?: string,
  cityName?: string,
): Promise<{ countery?: string; city?: string }> => {
  const result: { countery?: string; city?: string } = {};

  const trimmedCountry = countryName?.trim();
  if (!trimmedCountry) {
    if (countryName !== undefined) result.countery = trimmedCountry ?? '';
    if (cityName !== undefined) result.city = cityName?.trim() ?? '';
    return result;
  }

  const country = await Country.findOne({
    countryName: { $regex: `^${escapeRegExp(trimmedCountry)}$`, $options: 'i' },
  });

  if (countryName !== undefined) {
    result.countery = country ? country.countryName : trimmedCountry;
  }

  if (cityName !== undefined) {
    const trimmedCity = cityName?.trim() ?? '';
    const matchedCity = country?.cities.find(
      (c) => c.cityName.toLowerCase() === trimmedCity.toLowerCase(),
    );
    result.city = matchedCity ? matchedCity.cityName : trimmedCity;
  }

  return result;
};
