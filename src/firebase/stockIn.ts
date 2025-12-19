// src/firebase/stockIn.ts
import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  QuerySnapshot,
} from "firebase/firestore";

export interface StockItem {
  id?: string;
  productName?: string;
  category?: string;
  subcategory?: string; // New: For better categorization
  quantity?: number;
  weight?: string;
  costPrice?: number;
  purity?: string;
  remarks?: string;
  tagged?: boolean;
  tagId?: string | null;
  createdAt?: string;
}

// collection path: warehouse/stock/items
const stockCollection = collection(db, "warehouse", "stock", "items");

// ADD
export async function addToWarehouse(item: StockItem) {
  const payload = { ...item, createdAt: new Date().toISOString() };
  return await addDoc(stockCollection, payload);
}

// GET all stock
export async function getWarehouseStock(): Promise<StockItem[]> {
  const snap = await getDocs(stockCollection);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as StockItem) }));
}

// UPDATE
export async function updateStockItem(id: string, data: Partial<StockItem>) {
  return await updateDoc(doc(db, "warehouse", "stock", "items", id), data);
}

// DELETE
export async function deleteStockItem(id: string) {
  return await deleteDoc(doc(db, "warehouse", "stock", "items", id));
}

// GET only UNTAGGED stock items (tagged !== true)
export async function getUntaggedStockItems(): Promise<StockItem[]> {
  const snap = await getDocs(stockCollection);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as StockItem) }))
    .filter((it) => !it.tagged);
}

// DELETE ALL WAREHOUSE STOCK (PERMANENTLY)
export async function deleteAllWarehouseStock(): Promise<number> {
  const snap = await getDocs(stockCollection);
  const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  return snap.docs.length; // Return count of deleted items
}
