// src/pages/Shops/ShopExpenseReport.tsx - Expense Analysis & Reporting
import { useState, useEffect, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import toast from "react-hot-toast";
import {
  Calendar,
  Building2,
  TrendingUp,
  Download,
  Filter,
  PieChart,
  BarChart3,
  Printer,
} from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import ExcelJS from "exceljs";

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

type BranchName =
  | "Sangli"
  | "Satara1"
  | "Satara2"
  | "Karad1"
  | "Karad2"
  | "Kolhapur"
  | "Aurangabad";

type ExpenseCategory =
  | "Shop Expense"
  | "Incentive"
  | "Salary"
  | "Food Expense"
  | "Travel Expense"
  | "Cash Transfer";

interface DailyExpenseEntry {
  date: string;
  branch: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  remarks?: string;
}

interface TransactionEntry {
  label: string;
  description: string;
  amount: number;
}

interface ExpenseDocument {
  date: string;
  branch: string;
  entries: DailyExpenseEntry[];
  transactions?: TransactionEntry[];  // Transaction entries (income)
  totalExpense: number;
  totalTransaction?: number;  // Income from transactions
  balance?: number;  // Net balance (income - expense)
  createdAt: string;
  createdBy: string;
}

interface CategorySummary {
  category: ExpenseCategory;
  amount: number;
  count: number;
  percentage: number;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
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

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ShopExpenseReport() {
  // State: Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedBranch, setSelectedBranch] = useState<BranchName | "All">("All");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | "All">("All");

  // State: Data
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick filter presets
  const setDateRangePreset = (preset: "today" | "week" | "month" | "quarter" | "year") => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    let from: Date;
    let to: Date = today;

    switch (preset) {
      case "today":
        from = new Date(year, month, date);
        to = new Date(year, month, date);
        break;
      case "week":
        // Get start of week (Monday)
        from = new Date(today);
        const day = from.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday
        from.setDate(date + diff);
        break;
      case "month":
        from = new Date(year, month, 1);
        break;
      case "quarter":
        // Get current quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
        const quarterStartMonth = Math.floor(month / 3) * 3;
        from = new Date(year, quarterStartMonth, 1);
        break;
      case "year":
        from = new Date(year, 0, 1);
        break;
    }

    // Format dates as YYYY-MM-DD in LOCAL timezone (not UTC)
    // This fixes the issue where IST dates were showing as previous day
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const fromStr = formatLocalDate(from);
    const toStr = formatLocalDate(to);

    setDateFrom(fromStr);
    setDateTo(toStr);

    // Show toast with period info
    const periodName = preset === "today" ? "Today" :
      preset === "week" ? "This Week" :
        preset === "month" ? "This Month" :
          preset === "quarter" ? "This Quarter" : "This Year";
    toast.success(`📊 Loading ${periodName} expenses...`);
  };

  // Load expenses when filters change
  useEffect(() => {
    loadExpenses();
  }, [dateFrom, dateTo, selectedBranch]);

  // Load expenses from Firestore
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const expensesRef = collection(db, "expenses");

      // Build query conditionally to avoid composite index requirement
      // When filtering by branch, we can't use orderBy without creating an index
      let q;
      if (selectedBranch !== "All") {
        // Query with branch filter only (no orderBy)
        q = query(expensesRef, where("branch", "==", selectedBranch));
      } else {
        // Query all with orderBy
        q = query(expensesRef, orderBy("date", "desc"));
      }

      const snapshot = await getDocs(q);
      const loadedExpenses: ExpenseDocument[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as ExpenseDocument;
        // Client-side date filtering
        if (data.date >= dateFrom && data.date <= dateTo) {
          loadedExpenses.push(data);
        }
      });

      // Sort by date descending (client-side) when we didn't use orderBy in the query
      if (selectedBranch !== "All") {
        loadedExpenses.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      }

      setExpenses(loadedExpenses);

      // Only show toast if we found records (less intrusive)
      if (loadedExpenses.length > 0) {
        console.log(`✅ Loaded ${loadedExpenses.length} expense records from ${dateFrom} to ${dateTo}`);
      } else {
        console.log(`ℹ️ No expense records found for ${dateFrom} to ${dateTo}`);
      }
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast.error("Failed to load expenses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    let allEntries: DailyExpenseEntry[] = [];
    expenses.forEach((doc) => {
      allEntries = [...allEntries, ...doc.entries];
    });

    // Apply category filter
    if (selectedCategory !== "All") {
      allEntries = allEntries.filter((e) => e.category === selectedCategory);
    }

    const totalAmount = allEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalEntries = allEntries.length;

    // Category-wise summary
    const categoryMap = new Map<ExpenseCategory, { amount: number; count: number }>();
    allEntries.forEach((entry) => {
      const existing = categoryMap.get(entry.category) || { amount: 0, count: 0 };
      categoryMap.set(entry.category, {
        amount: existing.amount + entry.amount,
        count: existing.count + 1,
      });
    });

    const categorySummary: CategorySummary[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / totalAmount) * 100,
      })
    );

    // Sort by amount descending
    categorySummary.sort((a, b) => b.amount - a.amount);

    // Branch-wise summary
    const branchMap = new Map<string, number>();
    expenses.forEach((doc) => {
      const existing = branchMap.get(doc.branch) || 0;
      branchMap.set(doc.branch, existing + doc.totalExpense);
    });

    const branchSummary = Array.from(branchMap.entries())
      .map(([branch, amount]) => ({ branch, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Daily summary (income vs expenses)
    const dailyMap = new Map<string, {
      date: string;
      income: number;
      expense: number;
      balance: number;
    }>();

    expenses.forEach((doc) => {
      const existing = dailyMap.get(doc.date) || {
        date: doc.date,
        income: 0,
        expense: 0,
        balance: 0
      };

      // Add transaction totals as income
      const income = doc.totalTransaction || 0;
      const expense = doc.totalExpense || 0;

      dailyMap.set(doc.date, {
        date: doc.date,
        income: existing.income + income,
        expense: existing.expense + expense,
        balance: existing.balance + (income - expense),
      });
    });

    const dailySummary = Array.from(dailyMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalAmount,
      totalEntries,
      totalDays: expenses.length,
      categorySummary,
      branchSummary,
      allEntries,
      dailySummary,
    };
  }, [expenses, selectedCategory]);

  // Export to Excel
  const exportToExcel = async () => {
    const loadingToast = toast.loading("Generating Excel report...");

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Suwarnasparsh Jewellers";
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 30 },
        { header: "Value", key: "value", width: 20 },
      ];

      summarySheet.addRows([
        { metric: "Report Period", value: `${dateFrom} to ${dateTo}` },
        { metric: "Branch", value: selectedBranch },
        { metric: "Category Filter", value: selectedCategory },
        { metric: "Total Expense", value: `₹${stats.totalAmount.toLocaleString()}` },
        { metric: "Total Entries", value: stats.totalEntries },
        { metric: "Total Days", value: stats.totalDays },
        { metric: "Average per Day", value: `₹${(stats.totalAmount / stats.totalDays || 0).toFixed(2)}` },
      ]);

      // Sheet 2: Category Summary
      const categorySheet = workbook.addWorksheet("Category Summary");
      categorySheet.columns = [
        { header: "Category", key: "category", width: 25 },
        { header: "Amount (₹)", key: "amount", width: 15 },
        { header: "Count", key: "count", width: 10 },
        { header: "Percentage", key: "percentage", width: 15 },
      ];

      stats.categorySummary.forEach((cat) => {
        categorySheet.addRow({
          category: cat.category,
          amount: cat.amount,
          count: cat.count,
          percentage: `${cat.percentage.toFixed(2)}%`,
        });
      });

      // Sheet 3: Branch Summary
      const branchSheet = workbook.addWorksheet("Branch Summary");
      branchSheet.columns = [
        { header: "Branch", key: "branch", width: 20 },
        { header: "Total Expense (₹)", key: "amount", width: 20 },
      ];

      stats.branchSummary.forEach((branch) => {
        branchSheet.addRow(branch);
      });

      // Sheet 4: Detailed Entries
      const detailSheet = workbook.addWorksheet("Detailed Entries");
      detailSheet.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Branch", key: "branch", width: 15 },
        { header: "Category", key: "category", width: 20 },
        { header: "Description", key: "description", width: 30 },
        { header: "Amount (₹)", key: "amount", width: 15 },
        { header: "Remarks", key: "remarks", width: 30 },
      ];

      stats.allEntries.forEach((entry) => {
        detailSheet.addRow(entry);
      });

      // Style headers
      [summarySheet, categorySheet, branchSheet, detailSheet].forEach((sheet) => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Expense_Report_${dateFrom}_to_${dateTo}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("Excel report downloaded!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to generate Excel report");
    }
  };

  // Export to PDF - Daily expense reports (one page per day)
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      toast.error("Please allow popups for PDF generation");
      return;
    }

    // Group expenses by date
    const expensesByDate = new Map<string, ExpenseDocument>();
    expenses.forEach((doc) => {
      expensesByDate.set(doc.date, doc);
    });

    // Generate pages for each date in range
    const pages: string[] = [];
    const currentDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const expenseDoc = expensesByDate.get(dateStr);

      // Get transactions
      const transactions = expenseDoc?.transactions || [
        { label: "OPENING BAL", description: "", amount: 0 },
        { label: "GOLD SALE", description: "", amount: 0 },
        { label: "GOLD GST", description: "", amount: 0 },
        { label: "GOLD ADV", description: "", amount: 0 },
        { label: "STONE SALE", description: "", amount: 0 },
        { label: "STONE GST", description: "", amount: 0 },
        { label: "STONE ADVANCE", description: "", amount: 0 },
        { label: "CASH RECEIVED", description: "POLISHING", amount: 0 },
        { label: "CASH RECEIVED", description: "GST", amount: 0 },
      ];

      // Get expenses
      const expenseEntries = expenseDoc?.entries || [];

      const totalIncome = transactions.reduce((sum: number, t: TransactionEntry) => sum + (t.amount || 0), 0);
      const totalExpense = expenseEntries.reduce((sum: number, e: DailyExpenseEntry) => sum + (e.amount || 0), 0);
      const balance = totalIncome - totalExpense;

      // Transaction rows HTML
      const transactionRows = transactions.map((t: TransactionEntry) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99; font-weight: bold;">${t.label}</td>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99;">${t.description || ''}</td>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99; text-align: right;">${t.amount > 0 ? t.amount.toFixed(0) : ''}</td>
        </tr>
      `).join('');

      // Expense rows HTML
      const expenseRows = expenseEntries.map((e) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99; font-weight: bold;">${e.category}</td>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99;">${e.description || ''}</td>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99; text-align: right;">${e.amount > 0 ? e.amount.toFixed(0) : ''}</td>
        </tr>
      `).join('');

      // Add empty rows if needed to match format
      const emptyRowsNeeded = Math.max(0, 10 - expenseEntries.length);
      const emptyRows = Array(emptyRowsNeeded).fill(null).map(() => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99;">&nbsp;</td>
          <td style="border: 1px solid #000; padding: 8px; background: #ffff99;">&nbsp;</td>
        </tr>
      `).join('');

      const pageHTML = `
        <div class="page" style="page-break-after: always; padding: 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px; border: 2px solid #000; padding: 10px;">
            <h1 style="margin: 0; font-size: 18px; font-weight: bold;">MANGALMURTHI JEWELLERS</h1>
            <div style="background: #ff0000; color: white; font-weight: bold; padding: 5px; margin: 10px 0;">DAILY BRANCH REPORT</div>
            <p style="margin: 5px 0;">Date: ${new Date(dateStr).toLocaleDateString('en-GB')}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 8px; background: #ffff00; text-align: left; font-weight: bold;">${selectedBranch === 'All' ? (expenseDoc?.branch || 'BRANCH') : selectedBranch}</th>
                <th style="border: 1px solid #000; padding: 8px; background: #ffff00; text-align: left; font-weight: bold;">TRANSACTION</th>
                <th style="border: 1px solid #000; padding: 8px; background: #ffff00; text-align: right; font-weight: bold;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows}
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 8px; background: #ffff00; text-align: left; font-weight: bold;">EXPENSES</th>
                <th style="border: 1px solid #000; padding: 8px; background: #ffff00; text-align: left; font-weight: bold;">DESCRIPTION</th>
                <th style="border: 1px solid #000; padding: 8px; background: #ffff00; text-align: right; font-weight: bold;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRows}
              ${emptyRows}
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              <tr>
                <td style="border 1px solid #000; padding: 8px; background: #ffff00; font-weight: bold; text-align: right; width: 70%;">TOTAL</td>
                <td style="border: 1px solid #000; padding: 8px; background: #ffff00; font-weight: bold; text-align: right; width: 30%;">${totalIncome}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 8px; background: #ff0000; color: white; font-weight: bold; text-align: right;">BALANCE</td>
                <td style="border: 1px solid #000; padding: 8px; background: #ff0000; color: white; font-weight: bold; text-align: right;">${balance}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      pages.push(pageHTML);
      currentDate.setDate(currentDate.getDate() + 1);
    }


    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Expense Report - ${dateFrom} to ${dateTo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #000; }
          .page { background: white; }
          table { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @media print {
            body { margin: 0; }
            .page { page-break-after: always; }
            @page { size: A4; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${pages.join('')}
      </body>
      </html>
    `;

    // Use safer DOM manipulation instead of document.write()
    printWindow.document.documentElement.innerHTML = html;

    // Trigger print after content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast.success(`Generating PDF for ${pages.length} day(s)`);
  };

  // Input styles
  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Expense Report & Analysis (Daily/Monthly/Quarterly)"
        description="Generate daily, weekly, monthly, quarterly, and annual expense reports with detailed analysis"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="💰 Expense Report"
            subtitle="MangalMurthi Jewellers - Where is your money going?"
          >
            {/* Quick Period Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                📅 Select Period
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDateRangePreset("today")}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  Today
                </button>
                <button
                  onClick={() => setDateRangePreset("week")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  This Week
                </button>
                <button
                  onClick={() => setDateRangePreset("month")}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  This Month
                </button>
                <button
                  onClick={() => setDateRangePreset("quarter")}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  This Quarter
                </button>
                <button
                  onClick={() => setDateRangePreset("year")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  This Year
                </button>
              </div>
            </div>

            {/* Date Range & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                  Branch
                </label>
                <CustomDropdown
                  options={["All", ...BRANCHES]}
                  value={selectedBranch}
                  onChange={(val) => setSelectedBranch(val as BranchName | "All")}
                  placeholder="Select Branch"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                  Category
                </label>
                <CustomDropdown
                  options={["All", ...EXPENSE_CATEGORIES]}
                  value={selectedCategory}
                  onChange={(val) => setSelectedCategory(val as ExpenseCategory | "All")}
                  placeholder="Select Category"
                />
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-500 dark:text-gray-400">Loading expense data...</p>
              </div>
            ) : (
              <>
                {/* Total Expense - Big Number */}
                <div className="mb-6 p-8 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-2xl shadow-xl text-center">
                  <p className="text-sm opacity-90 mb-2">Total Expenses</p>
                  <h1 className="text-5xl font-bold mb-2">₹{stats.totalAmount.toLocaleString()}</h1>
                  <div className="flex justify-center gap-6 text-sm opacity-90">
                    <span>📝 {stats.totalEntries} entries</span>
                    <span>📅 {stats.totalDays} days</span>
                    <span>📊 ₹{((stats.totalAmount / stats.totalDays) || 0).toFixed(0)}/day</span>
                  </div>
                  {selectedBranch !== "All" && (
                    <div className="mt-3 py-2 px-4 bg-white/20 rounded-lg inline-block">
                      <span className="font-semibold">🏢 Branch: {selectedBranch}</span>
                    </div>
                  )}
                </div>

                {/* Branch-wise Breakdown (Only when "All" is selected) */}
                {selectedBranch === "All" && stats.branchSummary.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      🏢 Branch-wise Expense Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {stats.branchSummary.map((branch, index) => {
                        const branchColors = [
                          'from-blue-500 to-blue-600',
                          'from-green-500 to-green-600',
                          'from-purple-500 to-purple-600',
                          'from-orange-500 to-orange-600',
                          'from-pink-500 to-pink-600',
                          'from-cyan-500 to-cyan-600',
                          'from-indigo-500 to-indigo-600',
                        ];
                        const branchPercentage = stats.totalAmount > 0 ? (branch.amount / stats.totalAmount) * 100 : 0;

                        return (
                          <div
                            key={branch.branch}
                            className={`p-5 bg-gradient-to-br ${branchColors[index % branchColors.length]} text-white rounded-xl shadow-lg`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-semibold text-sm opacity-90">Branch</p>
                                <p className="text-xl font-bold">{branch.branch}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">₹{branch.amount.toLocaleString()}</p>
                                <p className="text-sm font-semibold opacity-90">{branchPercentage.toFixed(1)}%</p>
                              </div>
                            </div>
                            <div className="w-full bg-white/30 rounded-full h-2">
                              <div
                                className="bg-white h-2 rounded-full"
                                style={{ width: `${branchPercentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Daily Summary - Income vs Expenses */}
                {stats.dailySummary && stats.dailySummary.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      📅 Daily Summary - Income vs Expenses
                    </h3>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-blue-500 to-purple-500 text-white sticky top-0">
                            <tr className="text-left font-semibold">
                              <th className="p-3">Date</th>
                              <th className="p-3 text-right">Income (Transactions)</th>
                              <th className="p-3 text-right">Expenses</th>
                              <th className="p-3 text-right">Net Balance</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.dailySummary.map((day, index) => {
                              const isProfit = day.balance >= 0;
                              const maxValue = Math.max(
                                ...stats.dailySummary.map(d => Math.max(d.income, d.expense))
                              );
                              const incomePercentage = maxValue > 0 ? (day.income / maxValue) * 100 : 0;
                              const expensePercentage = maxValue > 0 ? (day.expense / maxValue) * 100 : 0;

                              return (
                                <tr
                                  key={index}
                                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  <td className="p-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {new Date(day.date).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </td>
                                  <td className="p-3">
                                    <div className="text-right mb-1">
                                      <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                                        ₹{day.income.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                      <div
                                        className="bg-green-500 h-1.5 rounded-full"
                                        style={{ width: `${incomePercentage}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="text-right mb-1">
                                      <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                                        ₹{day.expense.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                      <div
                                        className="bg-red-500 h-1.5 rounded-full"
                                        style={{ width: `${expensePercentage}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <span className={`font-mono font-bold text-lg ${isProfit
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                      }`}>
                                      {isProfit ? '+' : ''}₹{day.balance.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isProfit
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                      }`}>
                                      {isProfit ? '✓ Profit' : '✗ Loss'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 sticky bottom-0">
                            <tr className="font-bold">
                              <td className="p-3 text-gray-900 dark:text-white">Total</td>
                              <td className="p-3 text-right text-green-600 dark:text-green-400 font-mono text-lg">
                                ₹{stats.dailySummary.reduce((sum, day) => sum + day.income, 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-right text-red-600 dark:text-red-400 font-mono text-lg">
                                ₹{stats.dailySummary.reduce((sum, day) => sum + day.expense, 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-mono text-xl">
                                <span className={`${stats.dailySummary.reduce((sum, day) => sum + day.balance, 0) >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                                  }`}>
                                  ₹{stats.dailySummary.reduce((sum, day) => sum + day.balance, 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="p-3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Expense Categories - Visual Breakdown */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    📊 Where is your money going?
                  </h3>

                  {stats.categorySummary.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stats.categorySummary.slice(0, 6).map((cat, index) => {
                        const colors = [
                          'from-red-500 to-orange-500',
                          'from-blue-500 to-cyan-500',
                          'from-green-500 to-emerald-500',
                          'from-purple-500 to-pink-500',
                          'from-yellow-500 to-orange-500',
                          'from-indigo-500 to-blue-500'
                        ];
                        return (
                          <div
                            key={cat.category}
                            className="p-5 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                                  {cat.category}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {cat.count} transactions
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  ₹{cat.amount.toLocaleString()}
                                </p>
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {cat.percentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <p>No expenses found for selected period</p>
                    </div>
                  )}
                </div>

                {/* Detailed Expense List */}
                {stats.allEntries.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      📋 Expense Details ({stats.allEntries.length} entries)
                    </h3>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 dark:bg-white/10 sticky top-0">
                            <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                              <th className="p-3">Date</th>
                              <th className="p-3">Branch</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Description</th>
                              <th className="p-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.allEntries.map((entry, index) => (
                              <tr
                                key={index}
                                className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                              >
                                <td className="p-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                  {new Date(entry.date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                                    {entry.branch}
                                  </span>
                                </td>
                                <td className="p-3 font-medium text-gray-900 dark:text-white">
                                  {entry.category}
                                </td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">
                                  {entry.description || '-'}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-red-600 dark:text-red-400">
                                  ₹{entry.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100 dark:bg-white/10 sticky bottom-0">
                            <tr>
                              <td colSpan={4} className="p-3 text-right font-bold text-gray-900 dark:text-white">
                                Total:
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-xl text-red-600 dark:text-red-400">
                                ₹{stats.totalAmount.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      const loadingToast = toast.loading("Refreshing data...");
                      loadExpenses().then(() => {
                        toast.dismiss(loadingToast);
                        toast.success("✅ Data refreshed!");
                      });
                    }}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Filter size={18} />
                    Refresh
                  </button>
                  <button
                    onClick={exportToPDF}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={18} />
                    Print Daily Reports (PDF)
                  </button>
                  <button
                    onClick={exportToExcel}
                    disabled={loading || expenses.length === 0}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={18} />
                    Export Excel
                  </button>
                </div>
              </>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
