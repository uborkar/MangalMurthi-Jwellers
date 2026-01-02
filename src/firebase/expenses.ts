// src/firebase/expenses.ts - Shop Expense Management
import { db } from "./config";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

export type BranchName =
  | "Sangli"
  | "Satara1"
  | "Satara2"
  | "Karad1"
  | "Karad2"
  | "Kolhapur"
  | "Aurangabad";

export type ExpenseCategory =
  | "Shop Expense"
  | "Incentive"
  | "Salary"
  | "Food Expense"
  | "Travel Expense"
  | "Cash Transfer";

export interface DailyExpenseEntry {
  date: string; // YYYY-MM-DD
  branch: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  remarks?: string;
}

export interface ExpenseDocument {
  date: string;
  branch: string;
  entries: DailyExpenseEntry[];
  totalExpense: number;
  createdAt: string;
  createdBy: string;
}

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  branch?: BranchName | "All";
  category?: ExpenseCategory | "All";
}

export interface ExpenseStats {
  totalAmount: number;
  totalEntries: number;
  totalDays: number;
  averagePerDay: number;
  byCategory: Record<ExpenseCategory, number>;
  byBranch: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Save daily expenses for a branch
 * Document ID format: {branch}_{date}
 */
export async function saveDailyExpenses(
  branch: BranchName,
  date: string,
  entries: DailyExpenseEntry[],
  createdBy: string = "current-user"
): Promise<void> {
  const docId = `${branch}_${date}`;
  const totalExpense = entries.reduce((sum, entry) => sum + entry.amount, 0);

  const expenseDoc: ExpenseDocument = {
    date,
    branch,
    entries,
    totalExpense,
    createdAt: new Date().toISOString(),
    createdBy,
  };

  const docRef = doc(db, "expenses", docId);
  await setDoc(docRef, expenseDoc);
}

/**
 * Get expenses for a specific branch and date
 */
export async function getDailyExpenses(
  branch: BranchName,
  date: string
): Promise<ExpenseDocument | null> {
  const docId = `${branch}_${date}`;
  const docRef = doc(db, "expenses", docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as ExpenseDocument;
  }
  return null;
}

/**
 * Get expenses with filters
 */
export async function getExpenses(
  filters: ExpenseFilters = {}
): Promise<ExpenseDocument[]> {
  const expensesRef = collection(db, "expenses");
  let q = query(expensesRef, orderBy("date", "desc"));

  // Apply branch filter if not "All"
  if (filters.branch && filters.branch !== "All") {
    q = query(q, where("branch", "==", filters.branch));
  }

  const snapshot = await getDocs(q);
  let expenses: ExpenseDocument[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as ExpenseDocument;
    
    // Client-side date filtering
    if (filters.dateFrom && data.date < filters.dateFrom) return;
    if (filters.dateTo && data.date > filters.dateTo) return;

    expenses.push(data);
  });

  // Apply category filter if specified
  if (filters.category && filters.category !== "All") {
    expenses = expenses.map((doc) => ({
      ...doc,
      entries: doc.entries.filter((e) => e.category === filters.category),
      totalExpense: doc.entries
        .filter((e) => e.category === filters.category)
        .reduce((sum, e) => sum + e.amount, 0),
    }));
  }

  return expenses;
}

/**
 * Calculate expense statistics
 */
export async function getExpenseStats(
  filters: ExpenseFilters = {}
): Promise<ExpenseStats> {
  const expenses = await getExpenses(filters);
  
  let allEntries: DailyExpenseEntry[] = [];
  expenses.forEach((doc) => {
    allEntries = [...allEntries, ...doc.entries];
  });

  const totalAmount = allEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalEntries = allEntries.length;
  const totalDays = expenses.length;
  const averagePerDay = totalDays > 0 ? totalAmount / totalDays : 0;

  // Category-wise totals
  const byCategory: Record<ExpenseCategory, number> = {
    "Shop Expense": 0,
    "Incentive": 0,
    "Salary": 0,
    "Food Expense": 0,
    "Travel Expense": 0,
    "Cash Transfer": 0,
  };

  allEntries.forEach((entry) => {
    byCategory[entry.category] += entry.amount;
  });

  // Branch-wise totals
  const byBranch: Record<string, number> = {};
  expenses.forEach((doc) => {
    byBranch[doc.branch] = (byBranch[doc.branch] || 0) + doc.totalExpense;
  });

  return {
    totalAmount,
    totalEntries,
    totalDays,
    averagePerDay,
    byCategory,
    byBranch,
  };
}

/**
 * Get expenses for a date range (for monthly/yearly reports)
 */
export async function getExpensesByDateRange(
  dateFrom: string,
  dateTo: string,
  branch?: BranchName
): Promise<ExpenseDocument[]> {
  return getExpenses({
    dateFrom,
    dateTo,
    branch: branch || "All",
  });
}

/**
 * Get monthly expense summary
 */
export async function getMonthlyExpenseSummary(
  year: number,
  month: number,
  branch?: BranchName
): Promise<ExpenseStats> {
  const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  return getExpenseStats({
    dateFrom,
    dateTo,
    branch: branch || "All",
  });
}

/**
 * Get yearly expense summary
 */
export async function getYearlyExpenseSummary(
  year: number,
  branch?: BranchName
): Promise<ExpenseStats> {
  const dateFrom = `${year}-01-01`;
  const dateTo = `${year}-12-31`;

  return getExpenseStats({
    dateFrom,
    dateTo,
    branch: branch || "All",
  });
}

/**
 * Check if expenses exist for a specific date and branch
 */
export async function expensesExist(
  branch: BranchName,
  date: string
): Promise<boolean> {
  const docId = `${branch}_${date}`;
  const docRef = doc(db, "expenses", docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

/**
 * Get all expense entries (flattened) for export
 */
export async function getAllExpenseEntries(
  filters: ExpenseFilters = {}
): Promise<DailyExpenseEntry[]> {
  const expenses = await getExpenses(filters);
  let allEntries: DailyExpenseEntry[] = [];
  
  expenses.forEach((doc) => {
    allEntries = [...allEntries, ...doc.entries];
  });

  return allEntries;
}
