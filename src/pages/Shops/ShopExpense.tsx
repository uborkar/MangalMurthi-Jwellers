// src/pages/Shops/ShopExpense.tsx - Daily Report (Transaction + Expenses)
import { useState, useEffect, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Plus, Trash2, Save, Calendar, Building2, AlertCircle, Printer } from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (LOCKED)
// ═══════════════════════════════════════════════════════════════════════

type BranchName = "Sangli" | "Satara1" | "Satara2" | "Karad1" | "Karad2" | "Kolhapur" | "Aurangabad";

type ExpenseCategory =
  | "Shop Expense"
  | "Incentive"
  | "Salary"
  | "Food Expense"
  | "Travel Expense"
  | "Cash Transfer";

interface TransactionEntry {
  label: string;
  description: string;
  amount: number;
}

interface DailyExpenseEntry {
  date: string;        // YYYY-MM-DD
  branch: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  remarks?: string;
}

interface ExpenseRow extends DailyExpenseEntry {
  id: string; // For UI tracking
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS (LOCKED)
// ═══════════════════════════════════════════════════════════════════════

const BRANCHES: BranchName[] = [
  "Sangli",
  "Satara1",
  "Satara2",
  "Karad1",
  "Karad2",
  "Kolhapur",
  "Aurangabad",
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Shop Expense",
  "Incentive",
  "Salary",
  "Food Expense",
  "Travel Expense",
  "Cash Transfer",
];

// Description examples (for placeholder/autocomplete)
const DESCRIPTION_EXAMPLES = [
  "GST Tax",
  "Electrician",
  "Jewellery Purchase",
  "Rent",
  "Staff Incentive",
  "Manager Incentive",
  "Bank Transfer",
  "Cash Given to Person",
  "Travel Allowance",
];

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ShopExpense() {
  // State: Filters (MANDATORY)
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedBranch, setSelectedBranch] = useState<BranchName>("Sangli");

  // State: Transaction Entries (Top Section)
  const [transactions, setTransactions] = useState<TransactionEntry[]>([
    { label: "OPENING BAL", description: "", amount: 0 },
    { label: "GOLD SALE", description: "", amount: 0 },
    { label: "GOLD GST", description: "", amount: 0 },
    { label: "GOLD ADV", description: "", amount: 0 },
    { label: "STONE SALE", description: "", amount: 0 },
    { label: "STONE GST", description: "", amount: 0 },
    { label: "STONE ADVANCE", description: "", amount: 0 },
    { label: "CASH RECEIVED", description: "POLISHING", amount: 0 },
    { label: "CASH RECEIVED", description: "GST", amount: 0 },
  ]);

  // State: Expense Rows (Bottom Section)
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
    {
      id: crypto.randomUUID(),
      date: selectedDate,
      branch: selectedBranch,
      category: "Shop Expense",
      description: "",
      amount: 0,
      remarks: "",
    },
  ]);

  // State: Loading
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing expenses when date/branch changes
  useEffect(() => {
    loadExpenses();
  }, [selectedDate, selectedBranch]);

  // Load expenses from Firestore
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const docId = `${selectedBranch}_${selectedDate}`;
      const docRef = doc(db, "expenses", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Load transactions
        if (data.transactions) {
          setTransactions(data.transactions);
        }
        
        // Load expense rows
        const loadedRows: ExpenseRow[] = data.entries.map((entry: DailyExpenseEntry) => ({
          ...entry,
          id: crypto.randomUUID(),
        }));
        setExpenseRows(loadedRows);
        toast.success(`Loaded daily report data`);
      } else {
        // Reset to defaults
        setTransactions([
          { label: "OPENING BAL", description: "", amount: 0 },
          { label: "GOLD SALE", description: "", amount: 0 },
          { label: "GOLD GST", description: "", amount: 0 },
          { label: "GOLD ADV", description: "", amount: 0 },
          { label: "STONE SALE", description: "", amount: 0 },
          { label: "STONE GST", description: "", amount: 0 },
          { label: "STONE ADVANCE", description: "", amount: 0 },
          { label: "CASH RECEIVED", description: "POLISHING", amount: 0 },
          { label: "CASH RECEIVED", description: "GST", amount: 0 },
        ]);
        setExpenseRows([
          {
            id: crypto.randomUUID(),
            date: selectedDate,
            branch: selectedBranch,
            category: "Shop Expense",
            description: "",
            amount: 0,
            remarks: "",
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  // Update transaction entry
  const updateTransaction = (index: number, field: keyof TransactionEntry, value: any) => {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  // Add new expense row
  const addRow = () => {
    const newRow: ExpenseRow = {
      id: crypto.randomUUID(),
      date: selectedDate,
      branch: selectedBranch,
      category: "Shop Expense",
      description: "",
      amount: 0,
      remarks: "",
    };
    setExpenseRows([...expenseRows, newRow]);
  };

  // Update expense row
  const updateRow = (id: string, field: keyof ExpenseRow, value: any) => {
    setExpenseRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Remove expense row
  const removeRow = (id: string) => {
    if (expenseRows.length === 1) {
      toast.error("At least one row is required");
      return;
    }
    setExpenseRows((prev) => prev.filter((row) => row.id !== id));
  };

  // Calculate total transaction (REAL-TIME)
  const totalTransaction = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  // Calculate total expense (REAL-TIME)
  const totalExpense = useMemo(() => {
    return expenseRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  }, [expenseRows]);

  // Calculate balance
  const balance = useMemo(() => {
    return totalTransaction - totalExpense;
  }, [totalTransaction, totalExpense]);

  // Validation - REMOVED STRICT VALIDATION, ALLOW OPTIONAL FIELDS
  const validateExpenses = (): boolean => {
    // No validation needed - allow saving with empty descriptions and 0 values
    return true;
  };

  // Save expenses
  const handleSave = async () => {
    // Validate
    if (!validateExpenses()) {
      return;
    }

    // Confirm if overwriting
    const docId = `${selectedBranch}_${selectedDate}`;
    const docRef = doc(db, "expenses", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const confirm = window.confirm(
        `⚠️ Daily report for ${selectedBranch} on ${selectedDate} already exists.\n\nDo you want to replace it?`
      );
      if (!confirm) return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Saving daily report...");

    try {
      // Prepare data (remove UI-only id field)
      const entries: DailyExpenseEntry[] = expenseRows.map((row) => ({
        date: row.date,
        branch: row.branch,
        category: row.category,
        description: row.description.trim(),
        amount: row.amount,
        remarks: row.remarks?.trim() || "",
      }));

      // Save to Firestore
      await setDoc(docRef, {
        date: selectedDate,
        branch: selectedBranch,
        transactions,
        entries,
        totalTransaction,
        totalExpense,
        balance,
        createdAt: new Date().toISOString(),
        createdBy: "current-user", // TODO: Get from auth
      });

      toast.dismiss(loadingToast);
      toast.success(`✅ Saved daily report (Balance: ₹${balance.toLocaleString()})`);
    } catch (error) {
      console.error("Error saving expenses:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to save daily report");
    } finally {
      setSaving(false);
    }
  };

  // Print daily report
  const handlePrint = () => {
    window.print();
  };

  // Input styles
  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Daily Report"
        description="Branch-wise daily transaction and expense report"
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print-daily-report, .print-daily-report * {
            visibility: visible;
          }
          
          .print-daily-report {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          
          .no-print {
            display: none !important;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
          }
          
          th, td {
            border: 1px solid black !important;
            padding: 8px !important;
          }
          
          thead {
            background-color: #ffff00 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          tbody tr {
            background-color: #ffff99 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          tfoot {
            background-color: #ffff00 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📒 Daily Report"
            subtitle="Suwarnasparsh Jewellers - Branch Accounting"
          >
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl no-print">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-1">
                    📋 Daily Report Format
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    This page records daily transactions (top) and expenses (bottom). 
                    Balance = Total Transaction - Total Expenses.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters Section (MANDATORY) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl no-print">
              <div>
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  <Calendar className="inline mr-1" size={14} />
                  Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={inputStyle}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  <Building2 className="inline mr-1" size={14} />
                  Branch *
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchName)}
                  className={inputStyle}
                  required
                >
                  {BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Printable Report */}
            <div id="printable-report">
              {/* Header (Print Only) */}
              <div style={{ display: 'none' }} className="print:block text-center mb-4">
                <h1 className="text-2xl font-bold" style={{ color: 'black' }}>SUWARNASPARSH JEWELLERS</h1>
                <h2 className="text-xl font-bold py-2" style={{ backgroundColor: '#ff0000', color: 'white' }}>DAILY REPORT</h2>
                <p className="text-lg" style={{ color: 'black' }}>Date: {new Date(selectedDate).toLocaleDateString('en-GB')}</p>
                <p className="text-lg font-bold" style={{ color: 'black' }}>{selectedBranch}</p>
              </div>

              {/* Transaction Section (Top) */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden mb-4">
                <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 no-print">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    💰 TRANSACTION
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 print:bg-yellow-300">
                      <tr className="text-left font-semibold text-gray-700 dark:text-gray-300 print:text-black print:font-bold">
                        <th className="p-3 border border-gray-300 dark:border-gray-700">{selectedBranch}</th>
                        <th className="p-3 border border-gray-300 dark:border-gray-700">TRANSACTION</th>
                        <th className="p-3 border border-gray-300 dark:border-gray-700 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t, index) => (
                        <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 print:bg-yellow-100">
                          <td className="p-3 border border-gray-300 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">{t.label}</td>
                          <td className="p-3 border border-gray-300 dark:border-gray-700">
                            <input
                              type="text"
                              value={t.description}
                              onChange={(e) => updateTransaction(index, "description", e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-white/90 print:border-0"
                              placeholder="Description..."
                            />
                          </td>
                          <td className="p-3 border border-gray-300 dark:border-gray-700 text-right">
                            <input
                              type="number"
                              value={t.amount || ""}
                              onChange={(e) => updateTransaction(index, "amount", Number(e.target.value))}
                              className="w-full bg-transparent border-none outline-none text-right text-gray-800 dark:text-white/90 print:border-0"
                              placeholder="0"
                              min="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-white/5 print:bg-yellow-300">
                      <tr>
                        <td colSpan={2} className="p-3 border border-gray-300 dark:border-gray-700 text-right font-bold text-gray-900 dark:text-white print:text-black">
                          TOTAL
                        </td>
                        <td className="p-3 border border-gray-300 dark:border-gray-700 text-right font-bold text-xl text-gray-900 dark:text-white print:text-black">
                          {totalTransaction}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Expense Section (Bottom) */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden mb-4">
                <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 no-print">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    💸 EXPENCES ({expenseRows.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 print:bg-yellow-300">
                      <tr className="text-left font-semibold text-gray-700 dark:text-gray-300 print:text-black print:font-bold">
                        <th className="p-3 border border-gray-300 dark:border-gray-700">Category</th>
                        <th className="p-3 border border-gray-300 dark:border-gray-700">Description</th>
                        <th className="p-3 border border-gray-300 dark:border-gray-700 text-right">Amount</th>
                        <th className="p-3 border border-gray-300 dark:border-gray-700 no-print">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 print:bg-yellow-100"
                        >
                          <td className="p-3 border border-gray-300 dark:border-gray-700">
                            <select
                              value={row.category}
                              onChange={(e) =>
                                updateRow(row.id, "category", e.target.value as ExpenseCategory)
                              }
                              className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-white/90 print:border-0"
                              required
                            >
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 border border-gray-300 dark:border-gray-700">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateRow(row.id, "description", e.target.value)}
                              placeholder="Enter description..."
                              className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-white/90 print:border-0"
                              list={`descriptions-${row.id}`}
                              required
                            />
                            <datalist id={`descriptions-${row.id}`}>
                              {DESCRIPTION_EXAMPLES.map((desc) => (
                                <option key={desc} value={desc} />
                              ))}
                            </datalist>
                          </td>
                          <td className="p-3 border border-gray-300 dark:border-gray-700 text-right">
                            <input
                              type="number"
                              value={row.amount || ""}
                              onChange={(e) => updateRow(row.id, "amount", Number(e.target.value))}
                              placeholder="0"
                              className="w-full bg-transparent border-none outline-none text-right text-gray-800 dark:text-white/90 print:border-0"
                              min="0"
                              required
                            />
                          </td>
                          <td className="p-3 border border-gray-300 dark:border-gray-700 text-center no-print">
                            <button
                              onClick={() => removeRow(row.id)}
                              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                              title="Delete row"
                              disabled={expenseRows.length === 1}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-white/5 print:bg-yellow-300">
                      <tr>
                        <td colSpan={2} className="p-3 border border-gray-300 dark:border-gray-700 text-right font-bold text-gray-900 dark:text-white print:text-black">
                          TOTAL
                        </td>
                        <td className="p-3 border border-gray-300 dark:border-gray-700 text-right font-bold text-xl text-gray-900 dark:text-white print:text-black">
                          {totalExpense}
                        </td>
                        <td className="no-print"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-gray-800 no-print">
                  <button
                    onClick={addRow}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    <Plus size={18} />
                    Add Expense Row
                  </button>
                </div>
              </div>

              {/* Balance Section */}
              <div className="rounded-xl border-2 border-red-600 bg-red-600 text-white overflow-hidden mb-4 balance-section">
                <div className="p-4 text-center">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>BALANCE</span>
                    <span className="text-3xl">{balance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 no-print">
              <button
                onClick={handlePrint}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                <Printer size={18} />
                Print Report
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                Save Report
              </button>
            </div>

            {/* Summary Info */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl no-print">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>📊 Summary:</strong> Transaction: ₹{totalTransaction.toLocaleString()} | 
                Expenses: ₹{totalExpense.toLocaleString()} | 
                Balance: <strong className={balance >= 0 ? "text-green-600" : "text-red-600"}>
                  ₹{balance.toLocaleString()}
                </strong>
              </p>
            </div>
          </TASection>
        </div>
      </div>

      {/* Print-Only Version (Hidden on screen, visible on print) */}
      <div className="print-daily-report" style={{ display: "none" }}>
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "15px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0" }}>SUWARNASPARSH JEWELLERS</h1>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", backgroundColor: "#ff0000", color: "white", padding: "8px", margin: "10px 0" }}>DAILY REPORT</h2>
          <p style={{ fontSize: "16px", margin: "5px 0" }}>Date: {new Date(selectedDate).toLocaleDateString('en-GB')}</p>
          <p style={{ fontSize: "16px", fontWeight: "bold", margin: "5px 0" }}>{selectedBranch}</p>
        </div>

        {/* Transaction Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead style={{ backgroundColor: "#ffff00" }}>
            <tr>
              <th style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>{selectedBranch}</th>
              <th style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>TRANSACTION</th>
              <th style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, index) => (
              <tr key={index} style={{ backgroundColor: "#ffff99" }}>
                <td style={{ border: "1px solid black", padding: "8px", fontWeight: "bold" }}>{t.label}</td>
                <td style={{ border: "1px solid black", padding: "8px" }}>{t.description}</td>
                <td style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>{t.amount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ backgroundColor: "#ffff00" }}>
            <tr>
              <td colSpan={2} style={{ border: "1px solid black", padding: "8px", textAlign: "right", fontWeight: "bold" }}>TOTAL</td>
              <td style={{ border: "1px solid black", padding: "8px", textAlign: "right", fontWeight: "bold", fontSize: "18px" }}>{totalTransaction}</td>
            </tr>
          </tfoot>
        </table>

        {/* Expenses Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead style={{ backgroundColor: "#ffff00" }}>
            <tr>
              <th style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>Category</th>
              <th style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>Description</th>
              <th style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenseRows.map((row) => (
              <tr key={row.id} style={{ backgroundColor: "#ffff99" }}>
                <td style={{ border: "1px solid black", padding: "8px" }}>{row.category}</td>
                <td style={{ border: "1px solid black", padding: "8px" }}>{row.description}</td>
                <td style={{ border: "1px solid black", padding: "8px", textAlign: "right" }}>{row.amount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ backgroundColor: "#ffff00" }}>
            <tr>
              <td colSpan={2} style={{ border: "1px solid black", padding: "8px", textAlign: "right", fontWeight: "bold" }}>TOTAL</td>
              <td style={{ border: "1px solid black", padding: "8px", textAlign: "right", fontWeight: "bold", fontSize: "18px" }}>{totalExpense}</td>
            </tr>
          </tfoot>
        </table>

        {/* Balance */}
        <div style={{ backgroundColor: "#ff0000", color: "white", padding: "15px", textAlign: "center", border: "2px solid #ff0000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "20px", fontWeight: "bold" }}>
            <span>BALANCE</span>
            <span style={{ fontSize: "28px" }}>{balance}</span>
          </div>
        </div>
      </div>
    </>
  );
}
