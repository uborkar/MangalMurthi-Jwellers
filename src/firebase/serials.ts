// src/firebase/serials.ts
import { doc, runTransaction, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./config";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CATEGORY-WISE SERIAL TRACKING SYSTEM WITH GAP FILLING
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Each jewelry category maintains its own independent serial counter.
 * This ensures proper tracking and organization by product type.
 * 
 * COUNTER KEY FORMAT: MG-{CATEGORY_CODE}-{YEAR}
 * 
 * EXAMPLES:
 * - Ring 2025:     MG-RNG-25 → Serials: 1, 2, 3, 4...
 * - Necklace 2025: MG-NCK-25 → Serials: 1, 2, 3, 4...
 * - Bracelet 2025: MG-BRC-25 → Serials: 1, 2, 3, 4...
 * 
 * GAP FILLING:
 * - If items are deleted, their serial numbers become available
 * - New items will reuse deleted serial numbers first
 * - Example: If serials 3, 5, 7 are deleted, next batch uses 3, 5, 7 first
 * 
 * WORKFLOW:
 * 1. User selects category (Ring) and quantity (10)
 * 2. System checks for gaps in existing serials
 * 3. Fills gaps first, then continues from counter
 * 4. Example: Counter at 10, gaps [3, 5], request 5 → Returns [3, 5, 11, 12, 13]
 * 
 * FIRESTORE STRUCTURE:
 * /counters/MG-RNG-25  → { value: 20, updatedAt: timestamp }
 * /counters/MG-NCK-25  → { value: 15, updatedAt: timestamp }
 * /counters/MG-BRC-25  → { value: 8,  updatedAt: timestamp }
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Find gaps in serial numbers for a given counter key
 * 
 * @param counterKey - Format: "MG-{CATEGORY_CODE}-{YEAR}"
 * @param maxSerial - Maximum serial number to check
 * @returns Promise<number[]> - Array of available serial numbers (gaps)
 */
async function findSerialGaps(counterKey: string, maxSerial: number): Promise<number[]> {
  if (maxSerial <= 0) return [];

  try {
    // Extract category code and year from counter key
    // Format: MG-RNG-25 → category code: RNG, year: 25
    const parts = counterKey.split('-');
    const categoryCode = parts[1];
    const year = parseInt('20' + parts[2]);

    // Query all items with this category code and year
    const itemsRef = collection(db, "warehouseItems");
    const q = query(
      itemsRef,
      where("categoryCode", "==", categoryCode),
      where("year", "==", year)
    );

    const snapshot = await getDocs(q);
    const usedSerials = new Set<number>();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.serial) {
        usedSerials.add(data.serial);
      }
    });

    // Find gaps: serials from 1 to maxSerial that are not used
    const gaps: number[] = [];
    for (let i = 1; i <= maxSerial; i++) {
      if (!usedSerials.has(i)) {
        gaps.push(i);
      }
    }

    return gaps.sort((a, b) => a - b);
  } catch (error) {
    console.error("Error finding serial gaps:", error);
    return [];
  }
}

/**
 * Reserve a block of serials for a given counter key (atomic transaction).
 * Fills gaps first, then continues from counter.
 * 
 * @param counterKey - Format: "MG-{CATEGORY_CODE}-{YEAR}" (e.g., "MG-RNG-25")
 * @param count - Number of serials to reserve (default: 1)
 * @returns Promise<{ start: number, end: number, serials: number[] }> - Reserved serial range and individual serials
 * 
 * @example
 * // First batch of Rings in 2025
 * const result = await reserveSerials("MG-RNG-25", 10);
 * // Returns: { start: 1, end: 10, serials: [1,2,3,4,5,6,7,8,9,10] }
 * 
 * // After deleting serials 3, 5, 7, request 5 more
 * const result = await reserveSerials("MG-RNG-25", 5);
 * // Returns: { start: 3, end: 13, serials: [3,5,7,11,12] }
 */
export async function reserveSerials(counterKey: string, count = 1) {
  const counterRef = doc(db, "counters", counterKey);
  
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data()?.value ?? 0) : 0;

    // Find gaps in existing serials
    const gaps = await findSerialGaps(counterKey, current);
    
    // Use gaps first, then continue from counter
    const reservedSerials: number[] = [];
    let gapsUsed = 0;
    
    // Fill from gaps
    for (let i = 0; i < Math.min(count, gaps.length); i++) {
      reservedSerials.push(gaps[i]);
      gapsUsed++;
    }
    
    // If we need more serials, continue from counter
    const remaining = count - gapsUsed;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        reservedSerials.push(current + i);
      }
      
      // Update counter
      const newValue = current + remaining;
      if (!snap.exists()) {
        tx.set(counterRef, { value: newValue, updatedAt: new Date() });
      } else {
        tx.update(counterRef, { value: newValue, updatedAt: new Date() });
      }
    }

    // Sort serials for consistent ordering
    reservedSerials.sort((a, b) => a - b);

    return {
      start: reservedSerials[0],
      end: reservedSerials[reservedSerials.length - 1],
      serials: reservedSerials
    };
  });
}
