// src/utils/barcode.ts
export function pad(n: number, size = 6) {
  return String(n).padStart(size, "0");
}

export function makeBarcodeValue(brand = "MG", catCode: string, locCode: string, year: number, serialNum: number, serialPad = 6) {
  const yy = String(year).slice(-2);
  const serialStr = pad(serialNum, serialPad);
  return `${brand}-${catCode}-${locCode}-${yy}-${serialStr}`; // MG-RNG-MAL-25-000123
}

/** Category codes - each category has independent serial tracking */
export const CATEGORY_CODES: Record<string, string> = {
  Ring: "RNG",
  Necklace: "NCK",
  Bracelet: "BRC",
  Earring: "ERG",
  Chain: "CHN",
  Pendant: "PEN",
  Bangle: "BNG",
  Anklet: "ANK",
  // Add more categories as needed
};

export const LOCATION_CODES: Record<string, string> = {
  "Mumbai Malad": "MAL",
  "Pune": "PUN",
  "Sangli": "SAN",
  "Satara": "STR",
  "Kolhapur": "KOL",
  "Mumbai": "MUM",
  "Nashik": "NSK",
  "Aurangabad": "AUR",
  // Add more locations as needed
};

/**
 * Get location code - uses predefined mapping or generates from location name
 * Examples: "Mumbai Malad" -> "MAL", "Kolhapur" -> "KOL", "New Location" -> "NEL"
 */
export function getLocationCode(location: string): string {
  // Check if we have a predefined code
  if (LOCATION_CODES[location]) {
    return LOCATION_CODES[location];
  }

  // Generate code from location name
  const words = location.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word: take first 3 letters uppercase
    return words[0].substring(0, 3).toUpperCase();
  } else {
    // Multiple words: take first letter of each word (up to 3)
    return words
      .slice(0, 3)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }
}
