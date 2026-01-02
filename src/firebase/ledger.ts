// src/firebase/ledger.ts - Comprehensive Ledger System for Financial Tracking
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

// ============================================
// TYPES
// ============================================

export type TransactionType =
  | "sale" // Completed sale (from billing)
  | "booking" // Sales booking with advance
  | "booking_payment" // Payment against booking
  | "booking_completion" // Booking converted to sale
  | "expense" // Shop expense
  | "transfer_out" // Stock transfer out
  | "transfer_in" // Stock transfer in
  | "return" // Sales return
  | "adjustment"; // Manual adjustment

export type PaymentStatus = "paid" | "partial" | "pending" | "overdue";

export interface LedgerEntry {
  id?: string;
  entryNo: string; // Unique entry number (LED-BRANCH-TIMESTAMP)
  branch: string;
  date: string; // ISO date string
  type: TransactionType;
  
  // Reference IDs
  referenceId: string; // Invoice ID, Booking ID, etc.
  referenceType: string; // "invoice", "booking", "expense", etc.
  
  // Party Details
  partyName: string;
  partyPhone?: string;
  partyType: "customer" | "supplier" | "internal" | "other";
  
  // Financial Details
  debit: number; // Money received/incoming
  credit: number; // Money paid/outgoing
  balance: number; // Running balance (debit - credit)
  
  // Booking-specific fields
  totalAmount?: number; // Total booking/sale amount
  advanceAmount?: number; // Advance paid
  pendingAmount?: number; // Amount pending
  
  // Additional Info
  description: string;
  remarks?: string;
  salesperson?: string;
  
  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  totalPending: number;
  totalAdvances: number;
  transactionCount: number;
}

export interface PartyLedger {
  partyName: string;
  partyPhone?: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  pendingAmount: number;
  transactions: LedgerEntry[];
}

// ============================================
// LEDGER OPERATIONS
// ============================================

/**
 * Create a ledger entry
 */
export async function createLedgerEntry(
  branch: string,
  entry: Omit<LedgerEntry, "id" | "entryNo" | "createdAt">
): Promise<string> {
  try {
    const entryNo = `LED-${branch}-${Date.now()}`;
    const ledgerRef = doc(collection(db, "ledger", branch, "entries"));
    
    const ledgerEntry: LedgerEntry = {
      ...entry,
      entryNo,
      branch,
      createdAt: new Date().toISOString(),
    };

    await setDoc(ledgerRef, ledgerEntry);
    console.log(`✅ Ledger entry created: ${entryNo}`);
    return ledgerRef.id;
  } catch (error) {
    console.error("Error creating ledger entry:", error);
    throw error;
  }
}

/**
 * Create ledger entry for completed sale (from billing)
 */
export async function createSaleLedgerEntry(
  branch: string,
  invoiceId: string,
  customerName: string,
  customerPhone: string | undefined,
  totalAmount: number,
  salesperson: string | undefined,
  userId: string
): Promise<void> {
  await createLedgerEntry(branch, {
    date: new Date().toISOString(),
    type: "sale",
    branch,
    referenceId: invoiceId,
    referenceType: "invoice",
    partyName: customerName,
    partyPhone: customerPhone,
    partyType: "customer",
    debit: totalAmount, // Money received
    credit: 0,
    balance: totalAmount,
    totalAmount,
    description: `Sale - Invoice ${invoiceId}`,
    salesperson,
    createdBy: userId,
  });
}

/**
 * Create ledger entry for sales booking with advance
 */
export async function createBookingLedgerEntry(
  branch: string,
  bookingId: string,
  bookingNo: string,
  partyName: string,
  partyPhone: string,
  netAmount: number,
  advanceAmount: number,
  pendingAmount: number,
  salesperson: string,
  userId: string
): Promise<void> {
  await createLedgerEntry(branch, {
    date: new Date().toISOString(),
    type: "booking",
    branch,
    referenceId: bookingId,
    referenceType: "booking",
    partyName,
    partyPhone,
    partyType: "customer",
    debit: advanceAmount, // Advance received
    credit: 0,
    balance: advanceAmount,
    totalAmount: netAmount,
    advanceAmount,
    pendingAmount,
    description: `Sales Booking ${bookingNo} - Advance Payment`,
    remarks: `Total: ₹${netAmount}, Advance: ₹${advanceAmount}, Pending: ₹${pendingAmount}`,
    salesperson,
    createdBy: userId,
  });
}

/**
 * Create ledger entry for booking payment (partial/full)
 */
export async function createBookingPaymentEntry(
  branch: string,
  bookingId: string,
  bookingNo: string,
  partyName: string,
  partyPhone: string,
  paymentAmount: number,
  remainingPending: number,
  userId: string
): Promise<void> {
  await createLedgerEntry(branch, {
    date: new Date().toISOString(),
    type: "booking_payment",
    branch,
    referenceId: bookingId,
    referenceType: "booking",
    partyName,
    partyPhone,
    partyType: "customer",
    debit: paymentAmount, // Payment received
    credit: 0,
    balance: paymentAmount,
    pendingAmount: remainingPending,
    description: `Payment against Booking ${bookingNo}`,
    remarks: `Payment: ₹${paymentAmount}, Remaining: ₹${remainingPending}`,
    createdBy: userId,
  });
}

/**
 * Create ledger entry for expense
 */
export async function createExpenseLedgerEntry(
  branch: string,
  expenseId: string,
  category: string,
  description: string,
  amount: number,
  userId: string
): Promise<void> {
  await createLedgerEntry(branch, {
    date: new Date().toISOString(),
    type: "expense",
    branch,
    referenceId: expenseId,
    referenceType: "expense",
    partyName: category,
    partyType: "other",
    debit: 0,
    credit: amount, // Money paid out
    balance: -amount,
    description: `Expense - ${category}: ${description}`,
    createdBy: userId,
  });
}

/**
 * Get all ledger entries for a branch
 */
export async function getBranchLedger(
  branch: string,
  startDate?: string,
  endDate?: string
): Promise<LedgerEntry[]> {
  try {
    const entriesRef = collection(db, "ledger", branch, "entries");
    let q = query(entriesRef, orderBy("date", "desc"));

    if (startDate && endDate) {
      q = query(
        entriesRef,
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc")
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LedgerEntry[];
  } catch (error) {
    console.error("Error fetching branch ledger:", error);
    throw error;
  }
}

/**
 * Get ledger summary for a branch
 */
export async function getBranchLedgerSummary(
  branch: string,
  startDate?: string,
  endDate?: string
): Promise<LedgerSummary> {
  const entries = await getBranchLedger(branch, startDate, endDate);

  const summary: LedgerSummary = {
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0,
    totalPending: 0,
    totalAdvances: 0,
    transactionCount: entries.length,
  };

  entries.forEach((entry) => {
    summary.totalDebit += entry.debit;
    summary.totalCredit += entry.credit;
    summary.totalPending += entry.pendingAmount || 0;
    
    if (entry.type === "booking" && entry.advanceAmount) {
      summary.totalAdvances += entry.advanceAmount;
    }
  });

  summary.netBalance = summary.totalDebit - summary.totalCredit;

  return summary;
}

/**
 * Get party-wise ledger (customer/supplier wise)
 */
export async function getPartyLedger(
  branch: string,
  partyName: string,
  startDate?: string,
  endDate?: string
): Promise<PartyLedger> {
  const allEntries = await getBranchLedger(branch, startDate, endDate);
  const partyEntries = allEntries.filter((e) => e.partyName === partyName);

  const ledger: PartyLedger = {
    partyName,
    partyPhone: partyEntries[0]?.partyPhone,
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
    pendingAmount: 0,
    transactions: partyEntries,
  };

  partyEntries.forEach((entry) => {
    ledger.totalDebit += entry.debit;
    ledger.totalCredit += entry.credit;
    ledger.pendingAmount += entry.pendingAmount || 0;
  });

  ledger.balance = ledger.totalDebit - ledger.totalCredit;

  return ledger;
}

/**
 * Get all parties with pending amounts
 */
export async function getPartiesWithPending(
  branch: string
): Promise<Array<{ partyName: string; partyPhone?: string; pendingAmount: number }>> {
  const entries = await getBranchLedger(branch);
  const partyMap = new Map<string, { phone?: string; pending: number }>();

  entries.forEach((entry) => {
    if (entry.pendingAmount && entry.pendingAmount > 0) {
      const existing = partyMap.get(entry.partyName) || { pending: 0 };
      partyMap.set(entry.partyName, {
        phone: entry.partyPhone || existing.phone,
        pending: existing.pending + entry.pendingAmount,
      });
    }
  });

  return Array.from(partyMap.entries()).map(([name, data]) => ({
    partyName: name,
    partyPhone: data.phone,
    pendingAmount: data.pending,
  }));
}

/**
 * Get ledger entries by type
 */
export async function getLedgerByType(
  branch: string,
  type: TransactionType,
  startDate?: string,
  endDate?: string
): Promise<LedgerEntry[]> {
  const allEntries = await getBranchLedger(branch, startDate, endDate);
  return allEntries.filter((e) => e.type === type);
}

/**
 * Export ledger to flat array for Excel
 */
export function flattenLedgerForExport(entries: LedgerEntry[]) {
  return entries.map((entry) => ({
    "Entry No": entry.entryNo,
    Date: new Date(entry.date).toLocaleDateString(),
    Type: entry.type,
    "Party Name": entry.partyName,
    Phone: entry.partyPhone || "-",
    Description: entry.description,
    Debit: entry.debit,
    Credit: entry.credit,
    Balance: entry.balance,
    "Total Amount": entry.totalAmount || "-",
    "Advance Amount": entry.advanceAmount || "-",
    "Pending Amount": entry.pendingAmount || "-",
    Salesperson: entry.salesperson || "-",
    Remarks: entry.remarks || "-",
  }));
}
