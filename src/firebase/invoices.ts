// src/firebase/invoices.ts
import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

export interface InvoiceRowPayload {
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
}

export interface InvoicePayload {
  branch: string;
  customerName: string | null;
  salesman: string | null;
  rows: InvoiceRowPayload[];
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

export interface InvoiceWithId extends InvoicePayload {
  id: string;
}

/**
 * Save invoice under:
 *   shops/{branch}/invoices/{autoId}
 * Returns invoiceId.
 */
export async function saveInvoice(
  branch: string,
  invoice: InvoicePayload
): Promise<string> {
  const colRef = collection(db, "shops", branch, "invoices");
  const docRef = await addDoc(colRef, invoice);
  return docRef.id;
}

/**
 * Get all invoices from a specific branch
 */
export async function getInvoicesByBranch(
  branch: string
): Promise<InvoiceWithId[]> {
  const colRef = collection(db, "shops", branch, "invoices");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as InvoicePayload),
  }));
}

/**
 * Get all invoices from all branches
 */
export async function getAllInvoices(): Promise<InvoiceWithId[]> {
  const branches = ["Sangli", "Miraj", "Kolhapur"];
  const allInvoices: InvoiceWithId[] = [];

  for (const branch of branches) {
    const invoices = await getInvoicesByBranch(branch);
    allInvoices.push(...invoices);
  }

  // Sort by date descending
  return allInvoices.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get invoices with filters
 */
export async function getFilteredInvoices(filters: {
  branch?: string;
  salesman?: string;
  startDate?: string;
  endDate?: string;
}): Promise<InvoiceWithId[]> {
  const { branch, salesman, startDate, endDate } = filters;
  
  let invoices: InvoiceWithId[] = [];

  if (branch) {
    invoices = await getInvoicesByBranch(branch);
  } else {
    invoices = await getAllInvoices();
  }

  // Apply filters
  return invoices.filter((invoice) => {
    // Salesman filter
    if (salesman && invoice.salesman !== salesman) {
      return false;
    }

    // Date range filter
    if (startDate || endDate) {
      const invoiceDate = new Date(invoice.createdAt);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (invoiceDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (invoiceDate > end) return false;
      }
    }

    return true;
  });
}
