// src/firebase/warehouse/rejected.ts
import { db } from "./config";
import { collection, addDoc } from "firebase/firestore";

export interface RejectedItem {
  label: string;
  category: string;
  reason?: string;
  stockRefId?: string | null;
  createdAt?: string;
}

const REJECTED_COLLECTION = collection(db, "warehouse", "rejected_items", "items");

export async function addRejectedItem(item: Omit<RejectedItem, "createdAt">) {
  const payload: RejectedItem = {
    ...item,
    createdAt: new Date().toISOString(),
  };
  return await addDoc(REJECTED_COLLECTION, payload);
}
