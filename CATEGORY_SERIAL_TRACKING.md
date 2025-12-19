# Category-Wise Serial Tracking System

## Overview
The warehouse tagging system uses **independent serial counters for each jewelry category**. This ensures proper organization and prevents serial number conflicts between different product types.

## How It Works

### Counter Key Format
```
MG-{CATEGORY_CODE}-{YEAR}
```

### Examples
| Category  | Code | Year | Counter Key | Serial Range Example |
|-----------|------|------|-------------|---------------------|
| Ring      | RNG  | 2025 | MG-RNG-25   | 1, 2, 3... 20       |
| Necklace  | NCK  | 2025 | MG-NCK-25   | 1, 2, 3... 15       |
| Bracelet  | BRC  | 2025 | MG-BRC-25   | 1, 2, 3... 8        |
| Earring   | ERG  | 2025 | MG-ERG-25   | 1, 2, 3... 12       |
| Chain     | CHN  | 2025 | MG-CHN-25   | 1, 2, 3... 25       |

## Real-World Scenario

### Scenario 1: First Batch
```
Action: Generate 20 Rings
Counter: MG-RNG-25 (doesn't exist yet)
Result: Serials 1-20 reserved
Counter Value After: 20
Barcodes: MG-RNG-MAL-25-000001 to MG-RNG-MAL-25-000020
```

### Scenario 2: Second Batch (Same Category)
```
Action: Generate 10 more Rings
Counter: MG-RNG-25 (current value: 20)
Result: Serials 21-30 reserved
Counter Value After: 30
Barcodes: MG-RNG-MAL-25-000021 to MG-RNG-MAL-25-000030
```

### Scenario 3: Different Category
```
Action: Generate 15 Necklaces
Counter: MG-NCK-25 (doesn't exist yet - INDEPENDENT!)
Result: Serials 1-15 reserved (starts fresh!)
Counter Value After: 15
Barcodes: MG-NCK-MAL-25-000001 to MG-NCK-MAL-25-000015
```

### Scenario 4: Back to Rings
```
Action: Generate 5 more Rings
Counter: MG-RNG-25 (current value: 30)
Result: Serials 31-35 reserved
Counter Value After: 35
Barcodes: MG-RNG-MAL-25-000031 to MG-RNG-MAL-25-000035
```

## Category Codes Reference

| Category | Code | Description           |
|----------|------|-----------------------|
| Ring     | RNG  | Rings                 |
| Necklace | NCK  | Necklaces             |
| Bracelet | BRC  | Bracelets             |
| Earring  | ERG  | Earrings              |
| Chain    | CHN  | Chains                |
| Pendant  | PEN  | Pendants              |
| Bangle   | BNG  | Bangles               |
| Anklet   | ANK  | Anklets               |

## Location Codes Reference

| Location      | Code |
|---------------|------|
| Mumbai Malad  | MAL  |
| Pune          | PUN  |
| Sangli        | SAN  |

## Firestore Structure

### Counters Collection
```
/counters/
  ├── MG-RNG-25          { value: 35, updatedAt: "2025-12-16T10:30:00Z" }
  ├── MG-NCK-25          { value: 15, updatedAt: "2025-12-16T11:00:00Z" }
  ├── MG-BRC-25          { value: 8,  updatedAt: "2025-12-16T11:15:00Z" }
  ├── MG-ERG-25          { value: 12, updatedAt: "2025-12-16T11:30:00Z" }
  └── MG-CHN-25          { value: 25, updatedAt: "2025-12-16T12:00:00Z" }
```

### Tagged Items Collection
```
/warehouse/tagged_items/items/
  ├── {doc-id-1}
  │   ├── label: "MG-RNG-MAL-25-000001"
  │   ├── serial: 1
  │   ├── category: "CP-A"
  │   ├── subcategory: "FLORAL"
  │   ├── itemType: "Ring"
  │   ├── categoryCode: "RNG"
  │   └── ...
  │
  ├── {doc-id-2}
  │   ├── label: "MG-NCK-MAL-25-000001"
  │   ├── serial: 1
  │   ├── itemType: "Necklace"
  │   ├── categoryCode: "NCK"
  │   └── ...
```

## Key Benefits

1. **Independent Tracking**: Each category has its own serial sequence
2. **No Conflicts**: Ring serial 1 and Necklace serial 1 can coexist
3. **Easy Management**: Find all Rings by searching "MG-RNG-25-*"
4. **Year Separation**: 2025 Rings separate from 2026 Rings
5. **Scalable**: Add new categories without affecting existing counters

## Technical Implementation

### Serial Reservation (Atomic)
```typescript
// File: src/firebase/serials.ts
export async function reserveSerials(counterKey: string, count = 1) {
  const counterRef = doc(db, "counters", counterKey);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    if (!snap.exists()) {
      // First time: Start from 1
      const end = count;
      tx.set(counterRef, { value: end, updatedAt: new Date() });
      return { start: 1, end };
    } else {
      // Continue from last value
      const current = snap.data().value ?? 0;
      const start = current + 1;
      const end = current + count;
      tx.update(counterRef, { value: end, updatedAt: new Date() });
      return { start, end };
    }
  });
}
```

### Usage in Tagging Page
```typescript
// File: src/pages/Warehouse/Tagging.tsx
const handleGenerateBatch = async () => {
  const catCode = CATEGORY_CODES[category] ?? "UNK"; // "RNG", "NCK", etc.
  const counterKey = `MG-${catCode}-${String(year).slice(-2)}`; // "MG-RNG-25"
  
  // Reserve serials from category-specific counter
  const { start, end } = await reserveSerials(counterKey, quantity);
  
  // Generate barcodes
  for (let s = start; s <= end; s++) {
    const barcode = makeBarcodeValue("MG", catCode, locCode, year, s);
    // Result: MG-RNG-MAL-25-000001, MG-RNG-MAL-25-000002, etc.
  }
};
```

## Verification Steps

### Check Current Counters
1. Open Firebase Console
2. Navigate to Firestore → `counters` collection
3. View documents: `MG-RNG-25`, `MG-NCK-25`, etc.
4. Check `value` field to see last serial used

### Test Category Independence
1. Generate 10 Rings → Should get serials 1-10 (first time)
2. Generate 5 Necklaces → Should get serials 1-5 (independent!)
3. Generate 5 more Rings → Should get serials 11-15 (continues Ring counter)
4. Generate 3 Bracelets → Should get serials 1-3 (new category!)

### Success Indicators
- ✅ Each category starts from serial 1 on first batch
- ✅ Same category continues from last serial + 1
- ✅ Different categories don't interfere with each other
- ✅ Counter keys visible in Firestore with correct values
- ✅ Toast messages show correct serial ranges

## Troubleshooting

### Issue: All categories sharing same serials
**Cause**: Counter key not including category code  
**Solution**: Verify `CATEGORY_CODES` mapping is correct in `src/utils/barcode.ts`

### Issue: Serials not incrementing
**Cause**: Transaction failure or counter not updating  
**Solution**: Check Firestore rules, verify write permissions

### Issue: Duplicate serials
**Cause**: Not using transaction (race condition)  
**Solution**: Always use `reserveSerials()` function (atomic transaction)

### Issue: Category code showing "UNK"
**Cause**: Category name not in `CATEGORY_CODES` mapping  
**Solution**: Add category to `src/utils/barcode.ts` or update Firestore `settings/categories/items`

## Future Enhancements

1. **Counter Reset**: Annual counter reset with year change
2. **Counter Dashboard**: View all category counters in one place
3. **Counter History**: Track counter changes over time
4. **Bulk Import**: Import existing serial ranges
5. **Counter Sync**: Multi-location counter synchronization

---

**Last Updated**: December 16, 2025  
**Version**: 2.0 - Category-Wise Independent Tracking  
**Status**: ✅ Production Ready
