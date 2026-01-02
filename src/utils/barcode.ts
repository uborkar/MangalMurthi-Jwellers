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
export const CATEGORY_CODES: Record<string,string> = {
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

export const LOCATION_CODES: Record<string,string> = {
  "Mumbai Malad": "MAL",
  "Pune": "PUN",
  "Sangli": "SAN",
  "Satara": "STR",
  // Add more locations as needed
};
