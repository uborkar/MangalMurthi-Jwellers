// src/firebase/warehouseItems.ts - Unified Warehouse Items System
// Single source of truth for all warehouse items with status-based tracking

import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════════════
// UNIFIED WAREHOUSE ITEM MODEL
// ═══════════════════════════════════════════════════════════════════════

export type ItemStatus = 
  | "tagged"      // Just created, not printed yet
  | "printed"     // Labels printed, ready for stock-in
  | "stocked"     // In warehouse stock
  | "distributed" // Sent to shop
  | "sold"        // Sold at shop
  | "returned";   // Returned from shop to warehouse

export interface WarehouseItem {
  id?: string;
  
  // Barcode & Identity
  barcode: string; // MG-RNG-MAL-25-000001
  serial: number;
  
  // Category Information
  category: string; // Ring, Necklace, Bracelet, etc.
  subcategory: string; // Design/Pattern (e.g., FLORAL)
  categoryCode: string; // RNG, NCK, BRC, etc.
  
  // Physical Attributes
  weight: string;
  location: string; // Mumbai Malad, Pune, Sangli
  locationCode: string; // MAL, PUN, SAN
  
  // Pricing
  costPrice: number;
  costPriceType: string; // CP-A, CP-B, etc.
  sellingPrice?: number;
  
  // Status Tracking (SINGLE SOURCE OF TRUTH)
  status: ItemStatus;
  
  // Workflow Timestamps
  taggedAt: string;
  printedAt?: string;
  stockedAt?: string;
  stockedBy?: string;
  distributedAt?: string;
  distributedTo?: string; // Shop name
  distributedBy?: string;
  soldAt?: string;
  soldInvoiceId?: string;
  returnedAt?: string;
  returnedReason?: string;
  
  // Metadata
  remark: string; // Item name/description
  year: number;
  
  // Audit
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// FIRESTORE COLLECTION - FLAT STRUCTURE (INDUSTRY STANDARD)
// ═══════════════════════════════════════════════════════════════════════
// All items stay in ONE collection forever - never deleted
// Status field tracks current state
// Timestamps provide complete audit trail

const ITEMS_COLLECTION = collection(db, "warehouseItems");

// ═══════════════════════════════════════════════════════════════════════
// CREATE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Add new item to warehouse (from Tagging page)
 */
export async function addWarehouseItem(
  item: Omit<WarehouseItem, "id" | "createdAt" | "updatedAt" | "status">
): Promise<string> {
  const now = new Date().toISOString();
  
  const payload: Omit<WarehouseItem, "id"> = {
    ...item,
    status: "tagged",
    taggedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await addDoc(ITEMS_COLLECTION, payload);
  return docRef.id;
}

/**
 * Batch add multiple items (for Tagging page batch generation)
 */
export async function batchAddWarehouseItems(
  items: Omit<WarehouseItem, "id" | "createdAt" | "updatedAt" | "status">[]
): Promise<number> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  
  items.forEach((item) => {
    const docRef = doc(ITEMS_COLLECTION);
    const payload: Omit<WarehouseItem, "id"> = {
      ...item,
      status: "tagged",
      taggedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(docRef, payload);
  });
  
  await batch.commit();
  return items.length;
}

// ═══════════════════════════════════════════════════════════════════════
// READ OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all warehouse items
 */
export async function getAllWarehouseItems(): Promise<WarehouseItem[]> {
  const snap = await getDocs(ITEMS_COLLECTION);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItem, "id">),
  }));
}

/**
 * Get items by status
 */
export async function getItemsByStatus(status: ItemStatus): Promise<WarehouseItem[]> {
  console.log(`🔍 Querying warehouseItems where status == "${status}"`);
  const q = query(ITEMS_COLLECTION, where("status", "==", status));
  const snap = await getDocs(q);
  console.log(`✅ Query returned ${snap.size} documents`);
  
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItem, "id">),
  }));
  
  if (items.length > 0) {
    console.log("📦 Sample item:", items[0]);
  }
  
  return items;
}

/**
 * Get item by barcode
 */
export async function getItemByBarcode(barcode: string): Promise<WarehouseItem | null> {
  const q = query(ITEMS_COLLECTION, where("barcode", "==", barcode));
  const snap = await getDocs(q);
  
  if (snap.empty) return null;
  
  return {
    id: snap.docs[0].id,
    ...(snap.docs[0].data() as Omit<WarehouseItem, "id">),
  };
}

/**
 * Get items by category
 */
export async function getItemsByCategory(category: string): Promise<WarehouseItem[]> {
  const q = query(ITEMS_COLLECTION, where("category", "==", category));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItem, "id">),
  }));
}

/**
 * Get items distributed to a specific shop
 */
export async function getItemsByShop(shopName: string): Promise<WarehouseItem[]> {
  const q = query(
    ITEMS_COLLECTION,
    where("distributedTo", "==", shopName),
    where("status", "in", ["distributed", "sold"])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItem, "id">),
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// UPDATE OPERATIONS - UPDATE STATUS FIELD (NEVER DELETE)
// ═══════════════════════════════════════════════════════════════════════
// Industry Standard: Items are NEVER deleted, only status is updated
// This preserves complete audit trail and history

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 */
function removeUndefinedValues(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Update item status with automatic timestamp tracking
 */
export async function updateItemStatus(
  itemId: string,
  currentStatus: ItemStatus, // Not used in flat structure, kept for API compatibility
  newStatus: ItemStatus,
  metadata?: Record<string, any>
): Promise<void> {
  const now = new Date().toISOString();
  
  const updates: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
    ...metadata,
  };
  
  // Add timestamp for status transition
  switch (newStatus) {
    case "printed":
      updates.printedAt = now;
      break;
    case "stocked":
      updates.stockedAt = now;
      break;
    case "distributed":
      updates.distributedAt = now;
      break;
    case "sold":
      updates.soldAt = now;
      break;
    case "returned":
      updates.returnedAt = now;
      break;
  }
  
  // Remove undefined values
  const cleanedUpdates = removeUndefinedValues(updates);
  
  await updateDoc(doc(ITEMS_COLLECTION, itemId), cleanedUpdates);
}

/**
 * Batch update multiple items status
 */
export async function batchUpdateItemStatus(
  items: Array<{ id: string; currentStatus: ItemStatus }>,
  newStatus: ItemStatus,
  metadata?: Record<string, any>
): Promise<number> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  
  const updates: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
    ...metadata,
  };
  
  // Add timestamp for status transition
  switch (newStatus) {
    case "printed":
      updates.printedAt = now;
      break;
    case "stocked":
      updates.stockedAt = now;
      break;
    case "distributed":
      updates.distributedAt = now;
      break;
    case "sold":
      updates.soldAt = now;
      break;
    case "returned":
      updates.returnedAt = now;
      break;
  }
  
  // Remove undefined values
  const cleanedUpdates = removeUndefinedValues(updates);
  
  // Update each item's status field
  items.forEach((item) => {
    const docRef = doc(ITEMS_COLLECTION, item.id);
    batch.update(docRef, cleanedUpdates);
  });
  
  await batch.commit();
  return items.length;
}

/**
 * Update item details (weight, price, etc.) without changing status
 */
export async function updateItemDetails(
  itemId: string,
  currentStatus: ItemStatus, // Not used in flat structure, kept for API compatibility
  updates: Partial<WarehouseItem>
): Promise<void> {
  const payload = removeUndefinedValues({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  await updateDoc(doc(ITEMS_COLLECTION, itemId), payload);
}

// ═══════════════════════════════════════════════════════════════════════
// STATUS TRANSITION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mark items as printed (after printing labels)
 * Moves from tagged to printed subcollection
 */
export async function markItemsPrinted(itemIds: string[]): Promise<number> {
  const items = itemIds.map(id => ({ id, currentStatus: "tagged" as ItemStatus }));
  return await batchUpdateItemStatus(items, "printed", {
    printedAt: new Date().toISOString(),
  });
}

/**
 * Stock-in items (move from printed to stocked)
 */
export async function stockInItems(
  itemIds: string[],
  stockedBy?: string
): Promise<number> {
  const items = itemIds.map(id => ({ id, currentStatus: "printed" as ItemStatus }));
  return await batchUpdateItemStatus(items, "stocked", {
    stockedAt: new Date().toISOString(),
    stockedBy,
  });
}

/**
 * Distribute items to shop
 */
export async function distributeItems(
  itemIds: string[],
  shopName: string,
  distributedBy?: string
): Promise<number> {
  const items = itemIds.map(id => ({ id, currentStatus: "stocked" as ItemStatus }));
  return await batchUpdateItemStatus(items, "distributed", {
    distributedAt: new Date().toISOString(),
    distributedTo: shopName,
    distributedBy,
  });
}

/**
 * Mark item as sold
 */
export async function markItemSold(
  itemId: string,
  invoiceId: string
): Promise<void> {
  await updateItemStatus(itemId, "distributed", "sold", {
    soldAt: new Date().toISOString(),
    soldInvoiceId: invoiceId,
  });
}

/**
 * Return item to warehouse
 */
export async function returnItemToWarehouse(
  itemId: string,
  currentStatus: ItemStatus,
  reason: string
): Promise<void> {
  await updateItemStatus(itemId, currentStatus, "returned", {
    returnedAt: new Date().toISOString(),
    returnedReason: reason,
  });
}

/**
 * Re-stock returned item
 */
export async function restockReturnedItem(itemId: string): Promise<void> {
  await updateItemStatus(itemId, "returned", "stocked", {
    stockedAt: new Date().toISOString(),
    returnedReason: undefined, // Clear return reason
  });
}

// ═══════════════════════════════════════════════════════════════════════
// DELETE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Delete item (use with caution - prefer status updates)
 */
export async function deleteWarehouseItem(itemId: string, currentStatus?: ItemStatus): Promise<void> {
  await deleteDoc(doc(ITEMS_COLLECTION, itemId));
}

/**
 * Batch delete items
 */
export async function batchDeleteItems(
  items: Array<{ id: string; status: ItemStatus }>
): Promise<number> {
  const batch = writeBatch(db);
  
  items.forEach((item) => {
    const docRef = doc(ITEMS_COLLECTION, item.id);
    batch.delete(docRef);
  });
  
  await batch.commit();
  return items.length;
}

// ═══════════════════════════════════════════════════════════════════════
// STATISTICS & REPORTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get item count by status
 */
export async function getItemCountByStatus(): Promise<Record<ItemStatus, number>> {
  const items = await getAllWarehouseItems();
  
  const counts: Record<ItemStatus, number> = {
    tagged: 0,
    printed: 0,
    stocked: 0,
    distributed: 0,
    sold: 0,
    returned: 0,
  };
  
  items.forEach((item) => {
    counts[item.status]++;
  });
  
  return counts;
}

/**
 * Get item count by category
 */
export async function getItemCountByCategory(): Promise<Record<string, number>> {
  const items = await getAllWarehouseItems();
  
  const counts: Record<string, number> = {};
  
  items.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });
  
  return counts;
}

/**
 * Get total value by status
 */
export async function getTotalValueByStatus(): Promise<Record<ItemStatus, number>> {
  const items = await getAllWarehouseItems();
  
  const values: Record<ItemStatus, number> = {
    tagged: 0,
    printed: 0,
    stocked: 0,
    distributed: 0,
    sold: 0,
    returned: 0,
  };
  
  items.forEach((item) => {
    values[item.status] += item.costPrice || 0;
  });
  
  return values;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if barcode already exists
 */
export async function barcodeExists(barcode: string): Promise<boolean> {
  const item = await getItemByBarcode(barcode);
  return item !== null;
}

/**
 * Validate status transition
 */
export function isValidStatusTransition(from: ItemStatus, to: ItemStatus): boolean {
  const validTransitions: Record<ItemStatus, ItemStatus[]> = {
    tagged: ["printed"],
    printed: ["stocked"],
    stocked: ["distributed", "returned"],
    distributed: ["sold", "returned"],
    sold: ["returned"],
    returned: ["stocked"],
  };
  
  return validTransitions[from]?.includes(to) || false;
}

/**
 * Get next valid statuses for an item
 */
export function getNextValidStatuses(currentStatus: ItemStatus): ItemStatus[] {
  const validTransitions: Record<ItemStatus, ItemStatus[]> = {
    tagged: ["printed"],
    printed: ["stocked"],
    stocked: ["distributed", "returned"],
    distributed: ["sold", "returned"],
    sold: ["returned"],
    returned: ["stocked"],
  };
  
  return validTransitions[currentStatus] || [];
}
