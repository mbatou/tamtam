/**
 * Official Senegal cities list for TamTam platform.
 * Used for city normalization, searchable dropdowns, and campaign targeting.
 */

export const SENEGAL_CITIES = [
  "Dakar",
  "Guédiawaye",
  "Pikine",
  "Rufisque",
  "Thiès",
  "Saint-Louis",
  "Kaolack",
  "Ziguinchor",
  "Mbour",
  "Diourbel",
  "Louga",
  "Tambacounda",
  "Richard-Toll",
  "Kolda",
  "Matam",
  "Kaffrine",
  "Sédhiou",
  "Kédougou",
  "Fatick",
  "Tivaouane",
  "Joal-Fadiouth",
  "Saly",
  "Touba",
  "Mbacké",
  "Bignona",
  "Dagana",
  "Vélingara",
  "Nioro du Rip",
  "Oussouye",
  "Podor",
  "Gossas",
  "Bambey",
  "Foundiougne",
  "Sokone",
  "Pout",
  "Kayar",
  "Mékhé",
  "Nguékhokh",
  "Diamniadio",
  "Bargny",
] as const;

export type SenegalCity = (typeof SENEGAL_CITIES)[number];

/**
 * Alias map: common misspellings/variants → official city name.
 * Keys must be lowercase.
 */
const CITY_ALIASES: Record<string, SenegalCity> = {
  // Dakar variants
  dkr: "Dakar",
  dakarr: "Dakar",
  dakaar: "Dakar",
  // Guédiawaye variants
  guediawaye: "Guédiawaye",
  guediaway: "Guédiawaye",
  gediawaye: "Guédiawaye",
  // Pikine variants
  pikin: "Pikine",
  pikines: "Pikine",
  // Rufisque variants
  rufisk: "Rufisque",
  rufis: "Rufisque",
  // Thiès variants
  thies: "Thiès",
  tiès: "Thiès",
  ties: "Thiès",
  // Saint-Louis variants
  "saint louis": "Saint-Louis",
  "st louis": "Saint-Louis",
  "st-louis": "Saint-Louis",
  saintlouis: "Saint-Louis",
  ndar: "Saint-Louis",
  // Kaolack variants
  kaolak: "Kaolack",
  kaolac: "Kaolack",
  // Ziguinchor variants
  ziginchor: "Ziguinchor",
  ziguinchore: "Ziguinchor",
  zig: "Ziguinchor",
  // Mbour variants
  mbore: "Mbour",
  mboure: "Mbour",
  // Diourbel variants
  diourbell: "Diourbel",
  diourbelle: "Diourbel",
  // Louga variants
  louga: "Louga",
  // Tambacounda variants
  tamba: "Tambacounda",
  tambakounda: "Tambacounda",
  // Richard-Toll variants
  "richard toll": "Richard-Toll",
  richardtoll: "Richard-Toll",
  // Kolda variants
  koldha: "Kolda",
  // Matam variants
  mattam: "Matam",
  // Kaffrine variants
  kafrine: "Kaffrine",
  // Sédhiou variants
  sedhiou: "Sédhiou",
  // Kédougou variants
  kedougou: "Kédougou",
  kdougou: "Kédougou",
  // Fatick variants
  fatik: "Fatick",
  // Tivaouane variants
  tivaoune: "Tivaouane",
  tivaoane: "Tivaouane",
  // Joal-Fadiouth variants
  "joal fadiouth": "Joal-Fadiouth",
  joal: "Joal-Fadiouth",
  // Saly variants
  "saly portudal": "Saly",
  // Touba variants
  tuba: "Touba",
  // Mbacké variants
  mbacke: "Mbacké",
  mbaké: "Mbacké",
  // Bignona variants
  bignonna: "Bignona",
  // Vélingara variants
  velingara: "Vélingara",
  // Nioro du Rip variants
  "nioro du rip": "Nioro du Rip",
  nioro: "Nioro du Rip",
  // Diamniadio variants
  diamnedio: "Diamniadio",
  diamnadio: "Diamniadio",
  // Bargny variants
  bargni: "Bargny",
  // Mékhé variants
  mekhe: "Mékhé",
  // Nguékhokh variants
  nguekhokh: "Nguékhokh",
};

/**
 * Normalize a city string to the official name.
 * Returns the normalized city name, or the original trimmed string if no match found.
 */
export function normalizeCity(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Exact match (case-insensitive) against official list
  const exactMatch = SENEGAL_CITIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Check aliases
  const alias = CITY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  // Strip accents and try again
  const stripped = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const accentMatch = SENEGAL_CITIES.find(
    (c) =>
      c
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") === stripped
  );
  if (accentMatch) return accentMatch;

  // No match found — return original trimmed value
  return trimmed;
}
