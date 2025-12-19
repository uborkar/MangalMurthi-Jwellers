// src/firebase/branchStock.ts
import { db } from "./config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

export interface BranchStockItem {
  id?: string;
  label: string;
  productName?: string;
  category?: string;
  weight?: string | number;
  weightG?: number;
  purity?: string;

  pricingMode?: "weight" | "type";
  typeAmount?: number;
  basePrice?: number;
  costPrice?: number;
  makingCharge?: number;
  stoneCharge?: number;
  profitPercent?: number;
  goldRate?: number;
  status?: "in-branch" | "reserved" | "sold" | "returned";

  createdAt?: string;
  transferredAt?: string;
}

/**
 * Correct path:
 * shops/{branch}/stockitem/{doc}
 */
export async function getBranchStock(
  branch: string
): Promise<BranchStockItem[]> {
  console.log("📌 Fetching from:", `shops/${branch}/stockitem`);

  const colRef = collection(db, "shops", branch, "stockitem");
  const snap = await getDocs(colRef);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as BranchStockItem),
  }));
}

/**
 * Mark a branch stock item as SOLD
 */
export async function markBranchItemSold(
  branch: string,
  itemId: string,
  invoiceId?: string
) {
  const ref = doc(db, "shops", branch, "stockitem", itemId);
  await updateDoc(ref, {
    status: "sold",
    soldAt: new Date().toISOString(),
    soldInvoiceId: invoiceId || null,
  });
}
