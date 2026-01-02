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
  invoiceId: string;
  branch: string;
  customerName?: string;
  customerPhone?: string;
  salespersonName?: string;
  items: Array<{
    barcode: string;
    category: string;
    subcategory?: string;
    location?: string;
    type?: string;
    weight?: string;
    costPrice?: number;
    sellingPrice: number;
    discount?: number;
    taxableAmount: number;
  }>;
  totals: {
    subtotal: number;
    totalDiscount?: number;
    taxable: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    gst: number;
    grandTotal: number;
  };
  gstType?: string;
  createdAt: string;
}

/**
 * Sales Return Item - Customer returns to shop
 */
export interface CustomerReturnItem {
  id?: string;
  returnId: string; // Unique return ID
  invoiceId: string;
  branch: string;
  barcode: string;
  category: string;
  subcategory?: string;
  location?: string;
  type?: string;
  weight?: string;
  sellingPrice: number;
  discount: number;
  taxableAmount: number;
  returnReason: string;
  remarks?: string;
  returnedBy: string;
  returnDate: string;
  status: "returned-to-shop"; // Back in shop inventory
  createdAt: string;
}

/**
 * Warehouse Return Item - Shop returns to warehouse
 */
export interface WarehouseReturnItem {
  id?: string;
  returnId: string; // Unique return ID
  branch: string;
  barcode: string;
  category: string;
  subcategory?: string;
  location?: string;
  type?: string;
  weight?: string;
  costPrice?: number;
  returnReason: string;
  remarks?: string;
  returnedBy: string;
  returnDate: string;
  status: "pending-warehouse" | "received-warehouse" | "restocked";
  createdAt: string;
}

/**
 * Add a customer return record (customer returns to shop)
 * Path: shops/{branch}/customerReturns/{autoId}
 */
export async function addCustomerReturn(
  branch: string,
  returnData: Omit<CustomerReturnItem, "id" | "createdAt">
): Promise<string> {
  const colRef = collection(db, "shops", branch, "customerReturns");
  const docRef = await addDoc(colRef, {
    ...returnData,
    createdAt: new Date().toISOString(),
  });
  console.log(`✅ Customer return added: ${docRef.id}`);
  return docRef.id;
}

/**
 * Get all customer returns for a branch
 */
export async function getCustomerReturns(
  branch: string
): Promise<CustomerReturnItem[]> {
  const colRef = collection(db, "shops", branch, "customerReturns");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as CustomerReturnItem),
  }));
}

/**
 * Add a warehouse return record (shop returns to warehouse)
 * Path: warehouseReturns/{autoId}
 */
export async function addWarehouseReturn(
  returnData: Omit<WarehouseReturnItem, "id" | "createdAt">
): Promise<string> {
  const colRef = collection(db, "warehouseReturns");
  const docRef = await addDoc(colRef, {
    ...returnData,
    createdAt: new Date().toISOString(),
  });
  console.log(`✅ Warehouse return added: ${docRef.id}`);
  return docRef.id;
}

/**
 * Get all warehouse returns
 */
export async function getWarehouseReturns(): Promise<WarehouseReturnItem[]> {
  const colRef = collection(db, "warehouseReturns");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as WarehouseReturnItem),
  }));
}

/**
 * Update warehouse return status
 */
export async function updateWarehouseReturnStatus(
  id: string,
  status: WarehouseReturnItem["status"]
): Promise<void> {
  const docRef = doc(db, "warehouseReturns", id);
  await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
  console.log(`✅ Warehouse return status updated: ${id} -> ${status}`);
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
 * Path: shops/{branch}/stockItems/{barcode}
 */
export async function updateBranchStockStatus(
  branch: string,
  barcode: string,
  status: string
): Promise<void> {
  try {
    // Find stock item by barcode
    const stockRef = collection(db, "shops", branch, "stockItems");
    const snapshot = await getDocs(stockRef);
    
    const stockItem = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.barcode === barcode || data.label === barcode;
    });

    if (stockItem) {
      const docRef = doc(db, "shops", branch, "stockItems", stockItem.id);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
      console.log(`✅ Stock status updated: ${barcode} -> ${status}`);
    } else {
      console.warn(`⚠️ Stock item not found: ${barcode}`);
    }
  } catch (error) {
    console.error("Error updating stock status:", error);
    throw error;
  }
}

/**
 * Get stock item by barcode from branch
 */
export async function getStockItemByBarcode(
  branch: string,
  barcode: string
): Promise<any | null> {
  try {
    const stockRef = collection(db, "shops", branch, "stockItems");
    const snapshot = await getDocs(stockRef);
    
    const stockItem = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.barcode === barcode || data.label === barcode;
    });

    if (stockItem) {
      return {
        id: stockItem.id,
        ...stockItem.data()
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting stock item:", error);
    return null;
  }
}
