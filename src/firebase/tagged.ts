// src/firebase/tagged.ts
import { db } from "./config";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { getNextSerial } from "./serials";

export interface TaggedItem {
  id?: string;
  label: string;
  category: string; // Primary category: Ring, Necklace, etc.
  subcategory?: string; // Design/Pattern
  weight?: string;
  purity?: string;
  price?: number;
  stockRefId?: string | null;
  serial?: number;
  location?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: string;
  remark?: string; // Item name/description
  costPriceType?: string; // CP-A, CP-B, etc.
  barcodeValue?: string;
  categoryCode?: string;
  locationCode?: string;
  year?: number;
  printed?: boolean;
  printedAt?: string | null;
}

// collection: warehouse/tagged_items/items
const taggedCollection = collection(db, "warehouse", "tagged_items", "items");

export async function getTaggedItems(): Promise<TaggedItem[]> {
  const snap = await getDocs(taggedCollection);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TaggedItem) }));
}

export async function addTaggedItem(item: Omit<TaggedItem, "id" | "createdAt">) {
  const payload = { ...item, status: item.status || "pending", createdAt: new Date().toISOString() };
  return await addDoc(taggedCollection, payload);
}

export async function updateTaggedItem(id: string, data: Partial<TaggedItem>) {
  return await updateDoc(doc(db, "warehouse", "tagged_items", "items", id), data);
}

export async function deleteTaggedItem(id: string) {
  return await deleteDoc(doc(db, "warehouse", "tagged_items", "items", id));
}

/**
 * Helper if you still want to compute a count (not required when using serials)
 */
export async function getTaggedCountForCategory(category: string): Promise<number> {
  // simple heuristic: count tagged items of that category
  const q = query(taggedCollection, where("category", "==", category));
  const snap = await getDocs(q);
  return snap.size;
}

// DELETE ALL TAGGED ITEMS (PERMANENTLY)
export async function deleteAllTaggedItems(): Promise<number> {
  const snap = await getDocs(taggedCollection);
  const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  return snap.docs.length; // Return count of deleted items
}
