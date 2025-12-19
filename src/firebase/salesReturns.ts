// src/firebase/salesReturns.ts
import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

/**
 * Invoice data structure for return lookup
 */
export interface InvoiceData {
  branch: string;
  customerName?: string | null;
  salesman?: string | null;
  rows: Array<{
    stockItemId: string | null;
    label: string;
    productName: string;
    branch: string;
    pricingMode: "weight" | "type";
    weightG: number;
    goldRate: number;
    typeAmount: number;
    making: number;
    stoneCharge: number;
    profitPercent: number;
    qty: number;
    price: number;
    discount: number;
    taxableAmount: number;
  }>;
  totals: {
    subtotal: number;
    totalDiscount: number;
    taxable: number;
    gstTotal: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
  };
  gstRate: number;
  createdAt: string;
}

/**
 * Sales Return Item - returned from shop to warehouse
 */
export interface SalesReturnItem {
  id?: string;
  invoiceId: string;
  invoiceNumber?: string;
  branch: string;
  stockItemId?: string | null;
  label: string;
  productName?: string;
  type: string;
  location: string;
  qty: number;
  price: number;
  discount: number;
  gst: number;
  net: number;
  returnedBy?: string;
  returnDate: string;
  status: "pending" | "received" | "processed";
  remarks?: string;
  createdAt: string;
}

/**
 * Warehouse Return Record - tracks returned items in warehouse
 */
export interface WarehouseReturnItem {
  id?: string;
  productName: string;
  category: string;
  label: string;
  quantity: number;
  weight: string;
  condition: string;
  remarks: string;
  returnedFrom: string; // branch name
  returnDate: string;
  status: "pending" | "inspected" | "restocked" | "rejected";
  createdAt: string;
}

/**
 * Add a sales return record to Firestore
 * Path: shops/{branch}/returns/{autoId}
 */
export async function addSalesReturn(
  branch: string,
  returnData: Omit<SalesReturnItem, "id" | "createdAt">
): Promise<string> {
  const colRef = collection(db, "shops", branch, "returns");
  const docRef = await addDoc(colRef, {
    ...returnData,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Get all sales returns for a branch
 */
export async function getSalesReturns(
  branch: string
): Promise<SalesReturnItem[]> {
  const colRef = collection(db, "shops", branch, "returns");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as SalesReturnItem),
  }));
}

/**
 * Add a warehouse return record
 * Path: warehouse/returns/items/{autoId}
 */
export async function addWarehouseReturn(
  returnData: Omit<WarehouseReturnItem, "id" | "createdAt">
): Promise<string> {
  const colRef = collection(db, "warehouse", "returns", "items");
  const docRef = await addDoc(colRef, {
    ...returnData,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Get all warehouse returns
 */
export async function getWarehouseReturns(): Promise<WarehouseReturnItem[]> {
  const colRef = collection(db, "warehouse", "returns", "items");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as WarehouseReturnItem),
  }));
}

/**
 * Update warehouse return status
 */
export async function updateWarehouseReturn(
  id: string,
  updates: Partial<WarehouseReturnItem>
): Promise<void> {
  const docRef = doc(db, "warehouse", "returns", "items", id);
  await updateDoc(docRef, updates);
}

/**
 * Search for an invoice by invoice ID
 * Path: shops/{branch}/invoices/{invoiceId}
 */
export async function getInvoiceById(
  branch: string,
  invoiceId: string
): Promise<(InvoiceData & { id: string }) | null> {
  try {
    const docRef = doc(db, "shops", branch, "invoices", invoiceId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...(docSnap.data() as InvoiceData),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return null;
  }
}

/**
 * Get all invoices for a branch
 */
export async function getBranchInvoices(branch: string): Promise<(InvoiceData & { id: string })[]> {
  const colRef = collection(db, "shops", branch, "invoices");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as InvoiceData),
  }));
}

/**
 * Update branch stock item status after return
 * Path: shops/{branch}/stockItems/{stockItemId}
 */
export async function updateBranchStockStatus(
  branch: string,
  stockItemId: string,
  status: string
): Promise<void> {
  console.log(`Updating stock status: shops/${branch}/stockItems/${stockItemId} -> ${status}`);
  const docRef = doc(db, "shops", branch, "stockItems", stockItemId);
  await updateDoc(docRef, {
    status,
    returnedAt: new Date().toISOString(),
  });
}
