// src/firebase/warehouse.ts - New Label-Based Warehouse System

import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

// New Label-Based Warehouse Stock Item
export interface WarehouseStockItem {
  id?: string;
  barcode: string; // PRIMARY: Barcode/Label from tagging
  category: string; // Category from tagging
  subcategory: string; // Design/subcategory
  location: string; // Location
  weight: string; // Weight
  purity: string; // Purity (Gold Forming, etc.)
  costPrice: number; // Price
  status: "in_stock" | "distributed" | "returned"; // Stock status
  taggedItemId: string; // Reference to tagged item
  stockInDate: any; // Stock-in timestamp
  distributedTo?: string; // Shop location if distributed
  distributedDate?: any; // Distribution timestamp
  returnedDate?: any; // Return timestamp
}

const warehouseCollection = collection(db, "warehouse", "warehouse_stock", "items");

// ADD item to warehouse stock
export async function addWarehouseStock(item: Omit<WarehouseStockItem, "id">) {
  const payload = { 
    ...item,
    stockInDate: item.stockInDate || new Date(),
  };
  return await addDoc(warehouseCollection, payload);
}

// GET all warehouse stock
export async function getWarehouseStock(): Promise<WarehouseStockItem[]> {
  const snap = await getDocs(warehouseCollection);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseStockItem, "id">),
  }));
}

// GET stock by status
export async function getWarehouseStockByStatus(status: string): Promise<WarehouseStockItem[]> {
  const q = query(warehouseCollection, where("status", "==", status));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WarehouseStockItem, "id">),
  }));
}

// GET stock by label
export async function getWarehouseStockByLabel(label: string): Promise<WarehouseStockItem | null> {
  const q = query(warehouseCollection, where("label", "==", label));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return {
    id: snap.docs[0].id,
    ...(snap.docs[0].data() as Omit<WarehouseStockItem, "id">),
  };
}

// UPDATE warehouse stock
export async function updateWarehouseStock(
  id: string,
  data: Partial<WarehouseStockItem>
) {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  return await updateDoc(doc(db, "warehouse", "warehouse_stock", "items", id), payload);
}

// DELETE warehouse stock item
export async function deleteWarehouseStock(id: string) {
  return await deleteDoc(doc(db, "warehouse", "warehouse_stock", "items", id));
}

// GET balance/available stock
export async function getAvailableStock(): Promise<WarehouseStockItem[]> {
  return await getWarehouseStockByStatus("in_stock");
}

// GET distributed stock
export async function getDistributedStock(): Promise<WarehouseStockItem[]> {
  return await getWarehouseStockByStatus("distributed");
}
