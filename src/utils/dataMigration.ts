// src/utils/dataMigration.ts - Migrate old data to new unified system

import { db } from "../firebase/config";
import { collection, getDocs, writeBatch, doc, deleteDoc } from "firebase/firestore";
import { batchAddWarehouseItems } from "../firebase/warehouseItems";

/**
 * Migrate data from old collections to new unified warehouseItems collection
 */
export async function migrateOldDataToUnified() {
  const results = {
    taggedItems: 0,
    warehouseStock: 0,
    inventoryItems: 0,
    total: 0,
    errors: [] as string[],
  };

  try {
    // 1. Migrate from warehouse/tagged_items/items
    try {
      const taggedRef = collection(db, "warehouse", "tagged_items", "items");
      const taggedSnap = await getDocs(taggedRef);
      
      if (!taggedSnap.empty) {
        const items = taggedSnap.docs.map((d) => {
          const data = d.data();
          return {
            barcode: data.label || data.barcodeValue,
            serial: data.serial || 0,
            category: data.category || "Unknown",
            subcategory: data.subcategory || data.design || "",
            categoryCode: data.categoryCode || "UNK",
            location: data.location || "Unknown",
            locationCode: data.locationCode || "UNK",
            weight: data.weight || "",
            costPrice: data.price || data.costPrice || 0,
            costPriceType: data.costPriceType || "",
            remark: data.remark || "",
            year: data.year || new Date().getFullYear(),
            taggedAt: data.createdAt || new Date().toISOString(),
            printedAt: data.printedAt || undefined,
          };
        });
        
        await batchAddWarehouseItems(items);
        results.taggedItems = items.length;
      }
    } catch (error) {
      console.error("Error migrating tagged items:", error);
      results.errors.push("Failed to migrate tagged items");
    }

    // 2. Migrate from warehouse/warehouse_stock/items
    try {
      const stockRef = collection(db, "warehouse", "warehouse_stock", "items");
      const stockSnap = await getDocs(stockRef);
      
      if (!stockSnap.empty) {
        const items = stockSnap.docs.map((d) => {
          const data = d.data();
          return {
            barcode: data.barcode || data.label,
            serial: data.serial || 0,
            category: data.category || "Unknown",
            subcategory: data.subcategory || "",
            categoryCode: data.categoryCode || "UNK",
            location: data.location || "Unknown",
            locationCode: data.locationCode || "UNK",
            weight: data.weight || "",
            costPrice: data.costPrice || 0,
            costPriceType: data.costPriceType || "",
            remark: data.remark || "",
            year: data.year || new Date().getFullYear(),
            taggedAt: data.createdAt || new Date().toISOString(),
            stockedAt: data.stockInDate || new Date().toISOString(),
          };
        });
        
        await batchAddWarehouseItems(items);
        results.warehouseStock = items.length;
      }
    } catch (error) {
      console.error("Error migrating warehouse stock:", error);
      results.errors.push("Failed to migrate warehouse stock");
    }

    // 3. Migrate from warehouse/inventory/items
    try {
      const invRef = collection(db, "warehouse", "inventory", "items");
      const invSnap = await getDocs(invRef);
      
      if (!invSnap.empty) {
        const items = invSnap.docs.map((d) => {
          const data = d.data();
          return {
            barcode: data.label,
            serial: data.serial || 0,
            category: data.category || "Unknown",
            subcategory: data.subcategory || "",
            categoryCode: data.categoryCode || "UNK",
            location: data.location || "Unknown",
            locationCode: data.locationCode || "UNK",
            weight: data.weight || "",
            costPrice: data.price || 0,
            costPriceType: "",
            remark: "",
            year: new Date().getFullYear(),
            taggedAt: data.createdAt || new Date().toISOString(),
            stockedAt: data.createdAt || new Date().toISOString(),
          };
        });
        
        await batchAddWarehouseItems(items);
        results.inventoryItems = items.length;
      }
    } catch (error) {
      console.error("Error migrating inventory:", error);
      results.errors.push("Failed to migrate inventory");
    }

    results.total = results.taggedItems + results.warehouseStock + results.inventoryItems;
    return results;
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}

/**
 * Delete old collections after successful migration
 */
export async function deleteOldCollections() {
  const results = {
    taggedItems: 0,
    warehouseStock: 0,
    inventoryItems: 0,
    total: 0,
  };

  try {
    // Delete warehouse/tagged_items/items
    const taggedRef = collection(db, "warehouse", "tagged_items", "items");
    const taggedSnap = await getDocs(taggedRef);
    for (const d of taggedSnap.docs) {
      await deleteDoc(d.ref);
      results.taggedItems++;
    }

    // Delete warehouse/warehouse_stock/items
    const stockRef = collection(db, "warehouse", "warehouse_stock", "items");
    const stockSnap = await getDocs(stockRef);
    for (const d of stockSnap.docs) {
      await deleteDoc(d.ref);
      results.warehouseStock++;
    }

    // Delete warehouse/inventory/items
    const invRef = collection(db, "warehouse", "inventory", "items");
    const invSnap = await getDocs(invRef);
    for (const d of invSnap.docs) {
      await deleteDoc(d.ref);
      results.inventoryItems++;
    }

    results.total = results.taggedItems + results.warehouseStock + results.inventoryItems;
    return results;
  } catch (error) {
    console.error("Error deleting old collections:", error);
    throw error;
  }
}

/**
 * Clear all warehouse items (use with caution!)
 */
export async function clearAllWarehouseItems() {
  const itemsRef = collection(db, "warehouseItems");
  const snap = await getDocs(itemsRef);
  
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  
  await batch.commit();
  return snap.docs.length;
}

/**
 * Reset all counters (use with caution!)
 */
export async function resetAllCounters() {
  const countersRef = collection(db, "counters");
  const snap = await getDocs(countersRef);
  
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(d.ref);
  });
  
  await batch.commit();
  return snap.docs.length;
}
