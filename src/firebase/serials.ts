// src/firebase/serials.ts
import { doc, runTransaction } from "firebase/firestore";
import { db } from "./config";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CATEGORY-WISE SERIAL TRACKING SYSTEM
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
 * WORKFLOW:
 * 1. User selects category (Ring) and quantity (10)
 * 2. System checks counter "MG-RNG-25"
 * 3. If first time: Reserves serials 1-10
 * 4. If exists (last was 20): Reserves serials 21-30
 * 5. Next category (Necklace): Checks "MG-NCK-25" → Starts from 1
 * 
 * FIRESTORE STRUCTURE:
 * /counters/MG-RNG-25  → { value: 20, updatedAt: timestamp }
 * /counters/MG-NCK-25  → { value: 15, updatedAt: timestamp }
 * /counters/MG-BRC-25  → { value: 8,  updatedAt: timestamp }
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Reserve a block of serials for a given counter key (atomic transaction).
 * 
 * @param counterKey - Format: "MG-{CATEGORY_CODE}-{YEAR}" (e.g., "MG-RNG-25")
 * @param count - Number of serials to reserve (default: 1)
 * @returns Promise<{ start: number, end: number }> - Reserved serial range
 * 
 * @example
 * // First batch of Rings in 2025
 * const { start, end } = await reserveSerials("MG-RNG-25", 10);
 * // Returns: { start: 1, end: 10 }
 * 
 * // Second batch of Rings in 2025
 * const { start, end } = await reserveSerials("MG-RNG-25", 5);
 * // Returns: { start: 11, end: 15 }
 * 
 * // First batch of Necklaces in 2025 (independent counter)
 * const { start, end } = await reserveSerials("MG-NCK-25", 8);
 * // Returns: { start: 1, end: 8 }
 */
export async function reserveSerials(counterKey: string, count = 1) {
  const counterRef = doc(db, "counters", counterKey);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    if (!snap.exists()) {
      // initialize counter
      const end = count;
      tx.set(counterRef, { value: end, updatedAt: new Date() });
      return { start: 1, end };
    } else {
      const data = snap.data() as { value?: number };
      const current = data?.value ?? 0;
      const start = current + 1;
      const end = current + count;
      tx.update(counterRef, { value: end, updatedAt: new Date() });
      return { start, end };
    }
  });
}
