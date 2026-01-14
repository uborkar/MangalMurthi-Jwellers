// src/firebase/salesReturnBill.ts - Sales Return Bill Management
import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Sales Return Bill - Main return transaction record
 * Path: shops/{branch}/salesReturns/{returnId}
 */
export interface SalesReturnBill {
  id?: string;
  returnId: string; // "RET-{branch}-{timestamp}"
  originalInvoiceId: string;
  branch: string;
  customerName: string;
  customerPhone?: string;
  returnDate: string;
  processedBy: string; // salesperson name
  
  // Items being returned
  returnedItems: ReturnedItem[];
  
  // Return calculations
  calculations: {
    totalOriginalValue: number; // Sum of original selling prices
    totalReturnValue: number; // 50% of original (base for GST)
    returnRate: number; // Always 50 (%)
    cgst: number; // 1.5% of return value
    sgst: number; // 1.5% of return value
    igst: number; // 3% of return value (if applicable)
    totalCreditAmount: number; // Return value + GST
  };
  
  // Settlement details
  settlementType: "exchange" | "refund" | "store-credit";
  
  // Exchange details (if applicable)
  exchangeInvoiceId?: string; // New bill generated
  newBillTotal?: number;
  creditAdjusted?: number;
  balanceAmount?: number; // +ve = customer pays, -ve = refund
  
  // Refund details (if applicable)
  refundAmount?: number;
  refundMode?: "cash" | "card" | "upi";
  
  // Store credit details (if applicable)
  creditUsed?: boolean;
  creditBalance?: number;
  creditValidUntil?: string;
  
  status: "completed" | "pending" | "cancelled";
  createdAt: string;
  updatedAt?: string;
}

/**
 * Individual returned item
 */
export interface ReturnedItem {
  barcode: string;
  category: string;
  subcategory?: string;
  location?: string;
  type?: string;
  weight?: string;
  originalPrice: number; // Original selling price from invoice
  originalDiscount?: number;
  returnRate: number; // 50%
  returnAmount: number; // originalPrice * 0.5
  returnReason: string;
  remarks?: string;
  stockStatus: "returned-to-inventory" | "damaged" | "sent-to-warehouse";
}

/**
 * Store Credit Record
 * Path: shops/{branch}/storeCredits/{creditId}
 */
export interface StoreCredit {
  id?: string;
  creditId: string;
  customerName: string;
  customerPhone?: string;
  branch: string;
  returnId: string; // Reference to original return
  creditAmount: number;
  usedAmount: number;
  balanceAmount: number;
  issuedDate: string;
  validUntil: string;
  status: "active" | "fully-used" | "expired";
  usageHistory: Array<{
    usedDate: string;
    usedAmount: number;
    invoiceId: string;
  }>;
  createdAt: string;
}

// ============================================
// SALES RETURN OPERATIONS
// ============================================

/**
 * Create a new sales return bill
 */
export async function createSalesReturnBill(
  branch: string,
  returnData: Omit<SalesReturnBill, "id" | "createdAt">
): Promise<string> {
  try {
    const returnRef = collection(db, "shops", branch, "salesReturns");
    const docRef = await addDoc(returnRef, {
      ...returnData,
      createdAt: new Date().toISOString(),
    });
    
    console.log("✅ Sales return bill created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating sales return bill:", error);
    throw error;
  }
}

/**
 * Get sales return bill by ID
 */
export async function getSalesReturnById(
  branch: string,
  returnId: string
): Promise<(SalesReturnBill & { id: string }) | null> {
  try {
    const returnRef = doc(db, "shops", branch, "salesReturns", returnId);
    const returnDoc = await getDoc(returnRef);
    
    if (!returnDoc.exists()) {
      return null;
    }
    
    return {
      id: returnDoc.id,
      ...(returnDoc.data() as SalesReturnBill),
    };
  } catch (error) {
    console.error("❌ Error fetching sales return:", error);
    throw error;
  }
}

/**
 * Get all sales returns for a branch
 */
export async function getBranchSalesReturns(
  branch: string,
  limitCount: number = 50
): Promise<(SalesReturnBill & { id: string })[]> {
  try {
    const returnsRef = collection(db, "shops", branch, "salesReturns");
    const q = query(returnsRef, orderBy("createdAt", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as SalesReturnBill),
    }));
  } catch (error) {
    console.error("❌ Error fetching branch returns:", error);
    throw error;
  }
}

/**
 * Get returns for a specific invoice
 */
export async function getReturnsByInvoice(
  branch: string,
  invoiceId: string
): Promise<(SalesReturnBill & { id: string })[]> {
  try {
    const returnsRef = collection(db, "shops", branch, "salesReturns");
    const q = query(returnsRef, where("originalInvoiceId", "==", invoiceId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as SalesReturnBill),
    }));
  } catch (error) {
    console.error("❌ Error fetching invoice returns:", error);
    throw error;
  }
}

/**
 * Update invoice with return information
 */
export async function updateInvoiceWithReturn(
  branch: string,
  invoiceId: string,
  returnId: string,
  returnedBarcodes: string[]
): Promise<void> {
  try {
    const invoiceRef = doc(db, "shops", branch, "invoices", invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error("Invoice not found");
    }
    
    const currentData = invoiceDoc.data();
    const existingReturnIds = currentData.returnIds || [];
    const existingReturnedBarcodes = currentData.returnedItemBarcodes || [];
    
    await updateDoc(invoiceRef, {
      hasReturns: true,
      returnIds: [...existingReturnIds, returnId],
      returnedItemBarcodes: [...existingReturnedBarcodes, ...returnedBarcodes],
      updatedAt: new Date().toISOString(),
    });
    
    console.log("✅ Invoice updated with return info");
  } catch (error) {
    console.error("❌ Error updating invoice:", error);
    throw error;
  }
}

/**
 * Update stock item status after return
 */
export async function updateStockAfterReturn(
  branch: string,
  barcode: string,
  status: "in-branch" | "damaged"
): Promise<void> {
  try {
    // Find stock item by barcode
    const stockRef = collection(db, "shops", branch, "stockItems");
    const q = query(stockRef, where("barcode", "==", barcode), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn(`⚠️ Stock item not found for barcode: ${barcode}`);
      return;
    }
    
    const stockDoc = snapshot.docs[0];
    await updateDoc(doc(db, "shops", branch, "stockItems", stockDoc.id), {
      status: status,
      returnedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`✅ Stock status updated: ${barcode} → ${status}`);
  } catch (error) {
    console.error("❌ Error updating stock:", error);
    throw error;
  }
}

// ============================================
// STORE CREDIT OPERATIONS
// ============================================

/**
 * Create store credit
 */
export async function createStoreCredit(
  branch: string,
  creditData: Omit<StoreCredit, "id" | "createdAt">
): Promise<string> {
  try {
    const creditRef = collection(db, "shops", branch, "storeCredits");
    const docRef = await addDoc(creditRef, {
      ...creditData,
      createdAt: new Date().toISOString(),
    });
    
    console.log("✅ Store credit created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating store credit:", error);
    throw error;
  }
}

/**
 * Get active store credits for customer
 */
export async function getCustomerStoreCredits(
  branch: string,
  customerPhone: string
): Promise<(StoreCredit & { id: string })[]> {
  try {
    const creditsRef = collection(db, "shops", branch, "storeCredits");
    const q = query(
      creditsRef,
      where("customerPhone", "==", customerPhone),
      where("status", "==", "active"),
      orderBy("issuedDate", "desc")
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as StoreCredit),
    }));
  } catch (error) {
    console.error("❌ Error fetching store credits:", error);
    throw error;
  }
}

/**
 * Use store credit
 */
export async function useStoreCredit(
  branch: string,
  creditId: string,
  usedAmount: number,
  invoiceId: string
): Promise<void> {
  try {
    const creditRef = doc(db, "shops", branch, "storeCredits", creditId);
    const creditDoc = await getDoc(creditRef);
    
    if (!creditDoc.exists()) {
      throw new Error("Store credit not found");
    }
    
    const creditData = creditDoc.data() as StoreCredit;
    const newBalanceAmount = creditData.balanceAmount - usedAmount;
    const newUsedAmount = creditData.usedAmount + usedAmount;
    
    const newUsageHistory = [
      ...(creditData.usageHistory || []),
      {
        usedDate: new Date().toISOString(),
        usedAmount,
        invoiceId,
      },
    ];
    
    const newStatus = newBalanceAmount <= 0 ? "fully-used" : "active";
    
    await updateDoc(creditRef, {
      usedAmount: newUsedAmount,
      balanceAmount: newBalanceAmount,
      status: newStatus,
      usageHistory: newUsageHistory,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`✅ Store credit used: ₹${usedAmount}`);
  } catch (error) {
    console.error("❌ Error using store credit:", error);
    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate return amounts (50% rule + GST)
 */
export function calculateReturnAmounts(
  items: Array<{ originalPrice: number }>,
  gstType: "cgst_sgst" | "igst" = "cgst_sgst",
  cgstRate: number = 1.5,
  sgstRate: number = 1.5,
  igstRate: number = 3
): {
  totalOriginalValue: number;
  totalReturnValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalCreditAmount: number;
} {
  const totalOriginalValue = items.reduce((sum, item) => sum + item.originalPrice, 0);
  const totalReturnValue = totalOriginalValue * 0.5; // 50% return rate
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  if (gstType === "cgst_sgst") {
    cgst = (totalReturnValue * cgstRate) / 100;
    sgst = (totalReturnValue * sgstRate) / 100;
  } else {
    igst = (totalReturnValue * igstRate) / 100;
  }
  
  const totalGST = cgst + sgst + igst;
  const totalCreditAmount = totalReturnValue + totalGST;
  
  return {
    totalOriginalValue,
    totalReturnValue,
    cgst,
    sgst,
    igst,
    totalCreditAmount,
  };
}

/**
 * Check if item can be returned (not already returned)
 */
export async function canReturnItem(
  branch: string,
  invoiceId: string,
  barcode: string
): Promise<{ canReturn: boolean; reason?: string }> {
  try {
    const invoiceRef = doc(db, "shops", branch, "invoices", invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      return { canReturn: false, reason: "Invoice not found" };
    }
    
    const invoiceData = invoiceDoc.data();
    const returnedBarcodes = invoiceData.returnedItemBarcodes || [];
    
    if (returnedBarcodes.includes(barcode)) {
      return { canReturn: false, reason: "Item already returned" };
    }
    
    return { canReturn: true };
  } catch (error) {
    console.error("❌ Error checking return eligibility:", error);
    return { canReturn: false, reason: "Error checking eligibility" };
  }
}

/**
 * Generate return ID
 */
export function generateReturnId(branch: string): string {
  const timestamp = Date.now();
  return `RET-${branch.toUpperCase().substring(0, 3)}-${timestamp}`;
}

/**
 * Generate credit ID
 */
export function generateCreditId(branch: string): string {
  const timestamp = Date.now();
  return `CRD-${branch.toUpperCase().substring(0, 3)}-${timestamp}`;
}
