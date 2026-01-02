// src/firebase/warehouseStructured.ts - Structured Warehouse with Subcollections
import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface WarehouseItemStructured {
  id?: string;
  label: string; // Barcode
  barcodeValue: string;
  serial: number;
  category: string;
  subcategory: string;
  categoryCode: string;
  location: string;
  locationCode: string;
  weight: string;
  price: number;
  costPriceType: string;
  remark: string;
  year: number;
  printed?: boolean;
  printedAt?: string | null;
  stockedAt?: string | null;
  distributedAt?: string | null;
  distributedTo?: string | null;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// COLLECTION PATHS
// ═══════════════════════════════════════════════════════════════════════

const WAREHOUSE_ROOT = "warehouseItems";

const getTaggedCollection = () => collection(db, WAREHOUSE_ROOT, "tagged", "items");
const getPrintedCollection = () => collection(db, WAREHOUSE_ROOT, "printed", "items");
const getStockedCollection = () => collection(db, WAREHOUSE_ROOT, "stocked", "items");
const getDistributedCollection = () => collection(db, WAREHOUSE_ROOT, "distributed", "items");

// ═══════════════════════════════════════════════════════════════════════
// TAGGED ITEMS (Just created, not printed yet)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Add items to tagged subcollection
 */
export async function addTaggedItems(
  items: Omit<WarehouseItemStructured, "id" | "createdAt">[]
): Promise<number> {
  const batch = writeBatch(db);
  const taggedCol = getTaggedCollection();
  const now = new Date().toISOString();

  items.forEach((item) => {
    const docRef = doc(taggedCol);
    batch.set(docRef, {
      ...item,
      printed: false,
      printedAt: null,
      createdAt: now,
    });
  });

  await batch.commit();
  return items.length;
}

/**
 * Get all tagged items
 */
export async function getTaggedItems(): Promise<WarehouseItemStructured[]> {
  const snap = await getDocs(getTaggedCollection());
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItemStructured, "id">),
  }));
}

/**
 * Move items from tagged to printed
 */
export async function markItemsAsPrinted(itemIds: string[]): Promise<number> {
  const batch = writeBatch(db);
  const taggedCol = getTaggedCollection();
  const printedCol = getPrintedCollection();
  const now = new Date().toISOString();

  // Get items from tagged
  const taggedSnap = await getDocs(taggedCol);
  const itemsToMove = taggedSnap.docs.filter((d) => itemIds.includes(d.id));

  itemsToMove.forEach((docSnap) => {
    const data = docSnap.data();
    
    // Add to printed collection
    const printedRef = doc(printedCol);
    batch.set(printedRef, {
      ...data,
      printed: true,
      printedAt: now,
    });

    // Delete from tagged collection
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  return itemsToMove.length;
}

// ═══════════════════════════════════════════════════════════════════════
// PRINTED ITEMS (Labels printed, ready for stock-in)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all printed items (ready for stock-in)
 */
export async function getPrintedItems(): Promise<WarehouseItemStructured[]> {
  const snap = await getDocs(getPrintedCollection());
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItemStructured, "id">),
  }));
}

/**
 * Move items from printed to stocked (Stock-In operation)
 */
export async function stockInItems(itemIds: string[]): Promise<number> {
  const batch = writeBatch(db);
  const printedCol = getPrintedCollection();
  const stockedCol = getStockedCollection();
  const now = new Date().toISOString();

  // Get items from printed
  const printedSnap = await getDocs(printedCol);
  const itemsToMove = printedSnap.docs.filter((d) => itemIds.includes(d.id));

  itemsToMove.forEach((docSnap) => {
    const data = docSnap.data();
    
    // Add to stocked collection
    const stockedRef = doc(stockedCol);
    batch.set(stockedRef, {
      ...data,
      stockedAt: now,
    });

    // Delete from printed collection
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  return itemsToMove.length;
}

// ═══════════════════════════════════════════════════════════════════════
// STOCKED ITEMS (In warehouse, ready for distribution)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all stocked items (ready for distribution)
 */
export async function getStockedItems(): Promise<WarehouseItemStructured[]> {
  const snap = await getDocs(getStockedCollection());
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItemStructured, "id">),
  }));
}

/**
 * Move items from stocked to distributed (Distribution operation)
 */
export async function distributeItems(
  itemIds: string[],
  shopName: string
): Promise<number> {
  const batch = writeBatch(db);
  const stockedCol = getStockedCollection();
  const distributedCol = getDistributedCollection();
  const now = new Date().toISOString();

  // Get items from stocked
  const stockedSnap = await getDocs(stockedCol);
  const itemsToMove = stockedSnap.docs.filter((d) => itemIds.includes(d.id));

  itemsToMove.forEach((docSnap) => {
    const data = docSnap.data();
    
    // Add to distributed collection
    const distributedRef = doc(distributedCol);
    batch.set(distributedRef, {
      ...data,
      distributedAt: now,
      distributedTo: shopName,
    });

    // Delete from stocked collection
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  return itemsToMove.length;
}

// ═══════════════════════════════════════════════════════════════════════
// DISTRIBUTED ITEMS (Sent to shops)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all distributed items
 */
export async function getDistributedItems(): Promise<WarehouseItemStructured[]> {
  const snap = await getDocs(getDistributedCollection());
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItemStructured, "id">),
  }));
}

/**
 * Get distributed items by shop
 */
export async function getDistributedItemsByShop(
  shopName: string
): Promise<WarehouseItemStructured[]> {
  const q = query(getDistributedCollection(), where("distributedTo", "==", shopName));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseItemStructured, "id">),
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get counts for all subcollections
 */
export async function getWarehouseCounts(): Promise<{
  tagged: number;
  printed: number;
  stocked: number;
  distributed: number;
  total: number;
}> {
  const [taggedSnap, printedSnap, stockedSnap, distributedSnap] = await Promise.all([
    getDocs(getTaggedCollection()),
    getDocs(getPrintedCollection()),
    getDocs(getStockedCollection()),
    getDocs(getDistributedCollection()),
  ]);

  return {
    tagged: taggedSnap.size,
    printed: printedSnap.size,
    stocked: stockedSnap.size,
    distributed: distributedSnap.size,
    total: taggedSnap.size + printedSnap.size + stockedSnap.size + distributedSnap.size,
  };
}

/**
 * Search item by barcode across all subcollections
 */
export async function findItemByBarcode(
  barcode: string
): Promise<{ item: WarehouseItemStructured; location: string } | null> {
  const collections = [
    { name: "tagged", col: getTaggedCollection() },
    { name: "printed", col: getPrintedCollection() },
    { name: "stocked", col: getStockedCollection() },
    { name: "distributed", col: getDistributedCollection() },
  ];

  for (const { name, col } of collections) {
    const q = query(col, where("barcodeValue", "==", barcode));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const doc = snap.docs[0];
      return {
        item: {
          id: doc.id,
          ...(doc.data() as Omit<WarehouseItemStructured, "id">),
        },
        location: name,
      };
    }
  }

  return null;
}

/**
 * Delete item from any subcollection
 */
export async function deleteItem(itemId: string, location: string): Promise<void> {
  let colRef;
  
  switch (location) {
    case "tagged":
      colRef = doc(db, WAREHOUSE_ROOT, "tagged", "items", itemId);
      break;
    case "printed":
      colRef = doc(db, WAREHOUSE_ROOT, "printed", "items", itemId);
      break;
    case "stocked":
      colRef = doc(db, WAREHOUSE_ROOT, "stocked", "items", itemId);
      break;
    case "distributed":
      colRef = doc(db, WAREHOUSE_ROOT, "distributed", "items", itemId);
      break;
    default:
      throw new Error(`Unknown location: ${location}`);
  }

  await deleteDoc(colRef);
}
