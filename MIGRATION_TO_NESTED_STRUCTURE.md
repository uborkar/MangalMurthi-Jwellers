# 🔄 Migration to Nested Firestore Structure

## Current Structure (FLAT - What you have now):
```
warehouseItems/
  └── {itemId}/
      ├── barcode: "MG-RNG-MAL-25-000001"
      ├── status: "tagged"
      ├── category: "Ring"
      └── ... (130 items here)
```

## Target Structure (NESTED - What you want):
```
warehouse/
  ├── tagged_items/
  │   └── items/
  │       └── {itemId}/
  │           ├── label: "MG-RNG-MAL-25-000001"
  │           ├── status: "pending"
  │           └── ...
  │
  ├── warehouse_stock/
  │   └── items/
  │       └── {itemId}/
  │           ├── label: "MG-RNG-MAL-25-000001"
  │           ├── status: "stocked"
  │           └── ...
  │
  └── distributed_items/
      └── items/
          └── {itemId}/
              ├── label: "MG-RNG-MAL-25-000001"
              ├── shopName: "Sangli"
              └── ...
```

## Migration Steps:

### 1. Run Migration Script (Copy your 130 items)

```javascript
// Run this in browser console on your app
const migrateToNestedStructure = async () => {
  const db = firebase.firestore();
  const batch = db.batch();
  
  console.log('🔄 Starting migration...');
  
  // Get all items from flat structure
  const flatItems = await db.collection('warehouseItems').get();
  console.log(`Found ${flatItems.size} items to migrate`);
  
  let migratedCount = 0;
  
  // Copy each item to nested structure
  flatItems.forEach((doc) => {
    const data = doc.data();
    
    // Determine target collection based on status
    let targetPath;
    if (data.status === 'tagged' || data.status === 'printed') {
      targetPath = 'warehouse/tagged_items/items';
    } else if (data.status === 'stocked') {
      targetPath = 'warehouse/warehouse_stock/items';
    } else if (data.status === 'distributed') {
      targetPath = 'warehouse/distributed_items/items';
    } else {
      // Default to tagged_items
      targetPath = 'warehouse/tagged_items/items';
    }
    
    const nestedRef = db.collection(targetPath).doc();
    
    // Transform data to match nested structure
    batch.set(nestedRef, {
      label: data.barcode,
      barcodeValue: data.barcode,
      category: data.category,
      subcategory: data.subcategory || '',
      location: data.location,
      locationCode: data.locationCode,
      categoryCode: data.categoryCode,
      weight: data.weight || '',
      price: data.costPrice || 0,
      costPriceType: data.costPriceType || '',
      remark: data.remark || '',
      serial: data.serial,
      year: data.year,
      status: data.status === 'tagged' ? 'pending' : data.status,
      printed: data.status === 'printed',
      printedAt: data.printedAt || null,
      createdAt: data.createdAt || data.taggedAt || new Date().toISOString(),
    });
    
    migratedCount++;
  });
  
  // Commit the batch
  await batch.commit();
  console.log(`✅ Migrated ${migratedCount} items to nested structure`);
  
  // Verify migration
  const taggedCount = await db.collection('warehouse/tagged_items/items').get();
  const stockedCount = await db.collection('warehouse/warehouse_stock/items').get();
  
  console.log('📊 Migration Results:');
  console.log(`  - Tagged items: ${taggedCount.size}`);
  console.log(`  - Stocked items: ${stockedCount.size}`);
  console.log(`  - Total: ${taggedCount.size + stockedCount.size}`);
  
  return {
    migrated: migratedCount,
    tagged: taggedCount.size,
    stocked: stockedCount.size,
  };
};

// Run migration
migrateToNestedStructure().then(result => {
  console.log('🎉 Migration complete!', result);
  alert(`Migration complete! Migrated ${result.migrated} items.`);
});
```

### 2. After Migration - Delete Old Collection (OPTIONAL)

```javascript
// ONLY run this AFTER verifying migration worked!
const deleteOldCollection = async () => {
  const confirm = window.confirm('⚠️ This will DELETE the warehouseItems collection. Are you sure?');
  if (!confirm) return;
  
  const db = firebase.firestore();
  const batch = db.batch();
  
  const items = await db.collection('warehouseItems').get();
  items.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log('✅ Deleted old warehouseItems collection');
};

// deleteOldCollection(); // Uncomment to run
```

## Files That Need Updating:

1. ✅ `src/firebase/tagged.ts` - Already has nested structure
2. ❌ `src/pages/Warehouse/Tagging.tsx` - Update to use `tagged.ts`
3. ❌ `src/pages/Warehouse/StockIn.tsx` - Update to use `tagged.ts`
4. ❌ `src/pages/Warehouse/Distribution.tsx` - Update to use nested structure
5. ❌ `src/pages/Warehouse/WarehouseReports.tsx` - Update to read from nested

## Next Steps:

1. **Run the migration script** (copy your 130 items to nested structure)
2. **Verify in Firestore Console** that items are in `warehouse/tagged_items/items`
3. **I'll update all the code files** to use the nested structure
4. **Test everything works**
5. **Delete old `warehouseItems` collection** (optional)

## Ready to Proceed?

Say "yes" and I'll:
1. Give you the migration script to run
2. Update all the code files
3. Make everything work with nested structure

This will take about 10-15 minutes total.
