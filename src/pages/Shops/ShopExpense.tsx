// src/pages/Shops/ShopExpense.tsx - Daily Report (Transaction + Expenses)
import { useState, useEffect, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import toast from "react-hot-toast";
import { Plus, Trash2, Save, Calendar, AlertCircle, Printer } from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (LOCKED)
// ═══════════════════════════════════════════════════════════════════════

type BranchName = "Sangli" | "Satara1" | "Satara2" | "Karad1" | "Karad2" | "Kolhapur" | "Aurangabad" | string;

// ExpenseCategory is now dynamic (string) to allow adding new categories
type ExpenseCategory = string;

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

const DEFAULT_EXPENSE_CATEGORIES: string[] = [
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

  // State: Dynamic categories and branches (can be extended)
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [branches, setBranches] = useState<string[]>(BRANCHES);

  // Handler to add new category
  const handleAddCategory = (newCategory: string) => {
    if (!expenseCategories.includes(newCategory)) {
      setExpenseCategories([...expenseCategories, newCategory]);
      toast.success(`Added new category: ${newCategory}`);
    }
  };

  // Handler to add new branch
  const handleAddBranch = (newBranch: string) => {
    if (!branches.includes(newBranch)) {
      setBranches([...branches, newBranch]);
      toast.success(`Added new branch: ${newBranch}`);
    }
  };

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

  // Print daily report - Use popup window for reliable printing
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.error("Please allow popups for printing");
      return;
    }

    // Calculate totals
    const totalTransactions = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenseRows.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalTransactions - totalExpenses;

    const transactionRows = transactions.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${t.label}</td>
        <td>${t.description || '-'}</td>
        <td style="text-align:right">₹${t.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    const expenseRowsHtml = expenseRows.map((x, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${x.category}</td>
        <td>${x.description || '-'}</td>
        <td style="text-align:right">₹${x.amount.toFixed(2)}</td>
        <td>${x.remarks || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Report - ${selectedBranch} - ${new Date(selectedDate).toLocaleDateString('en-GB')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 24px; font-weight: bold; }
          .header h2 { font-size: 18px; background: #ff0000; color: white; padding: 8px; margin: 10px 0; }
          .header p { font-size: 14px; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #ffff00; padding: 10px; text-align: left; border: 1px solid #000; font-weight: bold; }
          td { padding: 8px; border: 1px solid #000; background: #ffff99; }
          tfoot td { background: #ffff00; font-weight: bold; }
          .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px; padding: 5px; background: #333; color: white; }
          .balance-box { background: #ff0000; color: white; padding: 15px; margin-top: 20px; text-align: center; }
          .balance-box h3 { font-size: 18px; margin-bottom: 10px; }
          .balance-row { display: flex; justify-content: space-between; padding: 5px 0; max-width: 400px; margin: 0 auto; }
          .signature-area { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature { text-align: center; width: 200px; }
          .signature-line { border-top: 1px solid #000; padding-top: 5px; margin-top: 50px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MangalMurthi JEWELLERS</h1>
          <h2>DAILY REPORT</h2>
          <p>Date: ${new Date(selectedDate).toLocaleDateString('en-GB')}</p>
          <p style="font-weight:bold">${selectedBranch}</p>
        </div>

        <div class="section-title">TRANSACTIONS / INCOME</div>
        <table>
          <thead>
            <tr>
              <th style="width:50px">#</th>
              <th>Label</th>
              <th>Description</th>
              <th style="width:120px">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows || '<tr><td colspan="4" style="text-align:center">No transactions</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right">TOTAL INCOME:</td>
              <td style="text-align:right">₹${totalTransactions.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="section-title">EXPENSES</div>
        <table>
          <thead>
            <tr>
              <th style="width:50px">#</th>
              <th>Category</th>
              <th>Description</th>
              <th style="width:120px">Amount</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHtml || '<tr><td colspan="5" style="text-align:center">No expenses</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right">TOTAL EXPENSE:</td>
              <td style="text-align:right">₹${totalExpenses.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="balance-box">
          <h3>DAILY BALANCE SUMMARY</h3>
          <div class="balance-row"><span>Total Income:</span> <span>₹${totalTransactions.toFixed(2)}</span></div>
          <div class="balance-row"><span>Total Expense:</span> <span>₹${totalExpenses.toFixed(2)}</span></div>
          <div class="balance-row" style="border-top:2px solid white; margin-top:10px; padding-top:10px; font-size:18px; font-weight:bold;">
            <span>NET BALANCE:</span> <span>₹${netBalance.toFixed(2)}</span>
          </div>
        </div>

        <div class="signature-area">
          <div class="signature">
            <div class="signature-line">Prepared By</div>
          </div>
          <div class="signature">
            <div class="signature-line">Verified By</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    // Use safer DOM manipulation instead of document.write()
    printWindow.document.documentElement.innerHTML = html;

    // Trigger print after content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
          /* Hide the main app container */
          #root > div {
            display: none !important;
          }
          
          /* Show only the print section */
          .print-daily-report {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            z-index: 9999 !important;
          }
          
          /* Hide no-print elements */
          .no-print {
            display: none !important;
          }
          
          /* Table styling */
          .print-daily-report table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
          }
          
          .print-daily-report th,
          .print-daily-report td {
            border: 1px solid black !important;
            padding: 8px !important;
            color: black !important;
          }
          
          .print-daily-report thead {
            background-color: #ffff00 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-daily-report tbody tr {
            background-color: #ffff99 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-daily-report tfoot {
            background-color: #ffff00 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Balance section */
          .print-daily-report .balance-section {
            background-color: #ff0000 !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Page setup */
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📒 Daily Report"
            subtitle="MangalMurthi  Jewellers - Branch Accounting"
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
                  Branch *
                </label>
                <CustomDropdown
                  options={branches}
                  value={selectedBranch}
                  onChange={(val) => setSelectedBranch(val as BranchName)}
                  onAddNew={handleAddBranch}
                  placeholder="Select Branch"
                  addNewPlaceholder="Add branch..."
                />
              </div>
            </div>

            {/* Printable Report */}
            <div id="printable-report">
              {/* Header (Print Only) */}
              <div style={{ display: 'none' }} className="print:block text-center mb-4">
                <h1 className="text-2xl font-bold" style={{ color: 'black' }}>MangalMurthi  JEWELLERS</h1>
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
                    <tbody>-
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
                            <CustomDropdown
                              options={expenseCategories}
                              value={row.category}
                              onChange={(val) => updateRow(row.id, "category", val as ExpenseCategory)}
                              onAddNew={handleAddCategory}
                              placeholder="Select Category"
                              addNewPlaceholder="Add category..."
                            />
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
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0" }}>MangalMurthi  JEWELLERS</h1>
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
