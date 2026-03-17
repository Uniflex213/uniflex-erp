// Zone data: countries → provinces/states with codes
export const COUNTRIES = [
  { code: "CA", label: "Canada" },
  { code: "US", label: "États-Unis" },
  { code: "MX", label: "Mexique" },
  { code: "FR", label: "France" },
] as const;

export const PROVINCES: Record<string, { code: string; label: string }[]> = {
  CA: [
    { code: "AB", label: "Alberta" },
    { code: "BC", label: "Colombie-Britannique" },
    { code: "MB", label: "Manitoba" },
    { code: "NB", label: "Nouveau-Brunswick" },
    { code: "NL", label: "Terre-Neuve-et-Labrador" },
    { code: "NS", label: "Nouvelle-Écosse" },
    { code: "NT", label: "Territoires du Nord-Ouest" },
    { code: "NU", label: "Nunavut" },
    { code: "ON", label: "Ontario" },
    { code: "PE", label: "Île-du-Prince-Édouard" },
    { code: "QC", label: "Québec" },
    { code: "SK", label: "Saskatchewan" },
    { code: "YT", label: "Yukon" },
  ],
  US: [
    { code: "AL", label: "Alabama" },
    { code: "AK", label: "Alaska" },
    { code: "AZ", label: "Arizona" },
    { code: "AR", label: "Arkansas" },
    { code: "CA", label: "California" },
    { code: "CO", label: "Colorado" },
    { code: "CT", label: "Connecticut" },
    { code: "DE", label: "Delaware" },
    { code: "FL", label: "Florida" },
    { code: "GA", label: "Georgia" },
    { code: "HI", label: "Hawaii" },
    { code: "ID", label: "Idaho" },
    { code: "IL", label: "Illinois" },
    { code: "IN", label: "Indiana" },
    { code: "IA", label: "Iowa" },
    { code: "KS", label: "Kansas" },
    { code: "KY", label: "Kentucky" },
    { code: "LA", label: "Louisiana" },
    { code: "ME", label: "Maine" },
    { code: "MD", label: "Maryland" },
    { code: "MA", label: "Massachusetts" },
    { code: "MI", label: "Michigan" },
    { code: "MN", label: "Minnesota" },
    { code: "MS", label: "Mississippi" },
    { code: "MO", label: "Missouri" },
    { code: "MT", label: "Montana" },
    { code: "NE", label: "Nebraska" },
    { code: "NV", label: "Nevada" },
    { code: "NH", label: "New Hampshire" },
    { code: "NJ", label: "New Jersey" },
    { code: "NM", label: "New Mexico" },
    { code: "NY", label: "New York" },
    { code: "NC", label: "North Carolina" },
    { code: "ND", label: "North Dakota" },
    { code: "OH", label: "Ohio" },
    { code: "OK", label: "Oklahoma" },
    { code: "OR", label: "Oregon" },
    { code: "PA", label: "Pennsylvania" },
    { code: "RI", label: "Rhode Island" },
    { code: "SC", label: "South Carolina" },
    { code: "SD", label: "South Dakota" },
    { code: "TN", label: "Tennessee" },
    { code: "TX", label: "Texas" },
    { code: "UT", label: "Utah" },
    { code: "VT", label: "Vermont" },
    { code: "VA", label: "Virginia" },
    { code: "WA", label: "Washington" },
    { code: "WV", label: "West Virginia" },
    { code: "WI", label: "Wisconsin" },
    { code: "WY", label: "Wyoming" },
  ],
  MX: [
    { code: "AG", label: "Aguascalientes" },
    { code: "BC", label: "Baja California" },
    { code: "CM", label: "Campeche" },
    { code: "CL", label: "Coahuila" },
    { code: "CS", label: "Chiapas" },
    { code: "CH", label: "Chihuahua" },
    { code: "DF", label: "Ciudad de México" },
    { code: "DG", label: "Durango" },
    { code: "GT", label: "Guanajuato" },
    { code: "GR", label: "Guerrero" },
    { code: "JA", label: "Jalisco" },
    { code: "MX", label: "Estado de México" },
    { code: "MI", label: "Michoacán" },
    { code: "MO", label: "Morelos" },
    { code: "NL", label: "Nuevo León" },
    { code: "OA", label: "Oaxaca" },
    { code: "PU", label: "Puebla" },
    { code: "QT", label: "Querétaro" },
    { code: "SL", label: "San Luis Potosí" },
    { code: "SO", label: "Sonora" },
    { code: "VE", label: "Veracruz" },
    { code: "YU", label: "Yucatán" },
  ],
  FR: [
    { code: "IF", label: "Île-de-France" },
    { code: "AQ", label: "Nouvelle-Aquitaine" },
    { code: "OC", label: "Occitanie" },
    { code: "AR", label: "Auvergne-Rhône-Alpes" },
    { code: "PA", label: "Provence-Alpes-Côte d'Azur" },
    { code: "BR", label: "Bretagne" },
    { code: "NR", label: "Normandie" },
    { code: "HF", label: "Hauts-de-France" },
    { code: "GE", label: "Grand Est" },
    { code: "PL", label: "Pays de la Loire" },
  ],
};

/**
 * Generate zone code from province code + first letter of city
 * Example: province "QC" + city "Montreal" → "QCM"
 */
export function getZoneCode(provinceCode: string, city: string): string {
  const prov = provinceCode.toUpperCase().slice(0, 2);
  const cityLetter = (city.trim().charAt(0) || "X").toUpperCase();
  return `${prov}${cityLetter}`;
}

/**
 * Generate user code: INITIALS.ZONE.NUMBER
 * Example: firstName "Alex", lastName "Caron", province "QC", city "Montreal" → AC.QCM.213
 */
export function generateVendeurCode(
  firstName: string,
  lastName: string,
  provinceCode: string,
  city: string,
  customSuffix?: string
): string {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const zone = getZoneCode(provinceCode, city);
  const suffix = customSuffix || String(Math.floor(Math.random() * 900) + 100);
  return `${initials}.${zone}.${suffix}`;
}

/** @deprecated Use getZoneCode instead */
export function getRegionCode(region: string): string {
  return region.toUpperCase().slice(0, 2);
}

export async function isVendeurCodeUnique(
  supabase: any,
  code: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from("profiles")
    .select("id")
    .eq("vendeur_code", code);

  if (excludeUserId) query = query.neq("id", excludeUserId);

  const { data } = await query;
  return !data || data.length === 0;
}
