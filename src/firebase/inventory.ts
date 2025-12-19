// src/firebase/inventory.ts
import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";

export interface InventoryItem {
  id?: string;
  label: string;
  category: string;
  weight?: string;
  purity?: string;
  price?: number;
  stockRefId?: string | null;
  createdAt?: string;
  transferred?: boolean;
  transferredAt?: string;
  transferShop?: string;
}

// Inventory collection → /warehouse/inventory/items
const INVENTORY_COLLECTION = collection(
  db,
  "warehouse",
  "inventory",
  "items"
);

// ADD Approved Inventory
export async function addInventoryItem(
  item: Omit<InventoryItem, "id" | "createdAt" | "transferred">
) {
  const payload: InventoryItem = {
    ...item,
    transferred: false,
    createdAt: new Date().toISOString(),
  };

  return await addDoc(INVENTORY_COLLECTION, payload);
}

// GET Approved Items not Yet Transferred → for Distribution Page
export async function getAvailableInventory(): Promise<InventoryItem[]> {
  const snap = await getDocs(INVENTORY_COLLECTION);

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as InventoryItem) }))
    .filter((i) => !i.transferred); // only items not yet sent
}

// Mark item transferred & Move to Shop Stock
export async function markInventoryTransferred(
  item: InventoryItem,
  shop: string
) {
  if (!item.id) throw new Error("Missing item ID");

  const now = new Date().toISOString();

  // 1️⃣ Update warehouse inventory record
  await updateDoc(
    doc(db, "warehouse", "inventory", "items", item.id),
    {
      transferred: true,
      transferShop: shop,
      transferredAt: now,
    }
  );

  // 2️⃣ Add this item to shop stock
  const shopStockRef = doc(db, "shops", shop, "stockItems", item.id);

  await setDoc(shopStockRef, {
    ...item,
    transferred: true,
    transferredAt: now,
    transferredFrom: "Warehouse",
  });

  return true;
}
