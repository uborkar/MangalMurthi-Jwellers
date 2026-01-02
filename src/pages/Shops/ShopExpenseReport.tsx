// src/pages/Shops/ShopExpenseReport.tsx - Expense Analysis & Reporting
import { useState, useEffect, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  Calendar,
  Building2,
  TrendingUp,
  Download,
  Filter,
  PieChart,
  BarChart3,
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

interface ExpenseDocument {
  date: string;
  branch: string;
  entries: DailyExpenseEntry[];
  totalExpense: number;
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

  // Load expenses when filters change
  useEffect(() => {
    loadExpenses();
  }, [dateFrom, dateTo, selectedBranch]);

  // Load expenses from Firestore
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const expensesRef = collection(db, "expenses");
      let q = query(expensesRef, orderBy("date", "desc"));

      // Apply branch filter if not "All"
      if (selectedBranch !== "All") {
        q = query(q, where("branch", "==", selectedBranch));
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

      setExpenses(loadedExpenses);
      toast.success(`Loaded ${loadedExpenses.length} expense records`);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast.error("Failed to load expenses");
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

    return {
      totalAmount,
      totalEntries,
      totalDays: expenses.length,
      categorySummary,
      branchSummary,
      allEntries,
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

  // Input styles
  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Expense Report & Analysis"
        description="Analyze and export expense data"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 Expense Report & Analysis"
            subtitle="Suwarnasparsh Jewellers - Financial Insights"
          >
            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div>
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  <Calendar className="inline mr-1" size={14} />
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
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  <Calendar className="inline mr-1" size={14} />
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
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  <Building2 className="inline mr-1" size={14} />
                  Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchName | "All")}
                  className={inputStyle}
                >
                  <option value="All">All Branches</option>
                  {BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  <Filter className="inline mr-1" size={14} />
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as ExpenseCategory | "All")}
                  className={inputStyle}
                >
                  <option value="All">All Categories</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp size={24} />
                  <span className="text-xs opacity-80">Total</span>
                </div>
                <div className="text-2xl font-bold">₹{stats.totalAmount.toLocaleString()}</div>
                <div className="text-xs opacity-80 mt-1">Total Expense</div>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 size={24} />
                  <span className="text-xs opacity-80">Count</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalEntries}</div>
                <div className="text-xs opacity-80 mt-1">Total Entries</div>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Calendar size={24} />
                  <span className="text-xs opacity-80">Days</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalDays}</div>
                <div className="text-xs opacity-80 mt-1">Total Days</div>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <PieChart size={24} />
                  <span className="text-xs opacity-80">Average</span>
                </div>
                <div className="text-2xl font-bold">
                  ₹{((stats.totalAmount / stats.totalDays) || 0).toFixed(0)}
                </div>
                <div className="text-xs opacity-80 mt-1">Per Day</div>
              </div>
            </div>

            {/* Category Summary */}
            <div className="mb-6">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    📊 Category-wise Summary
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-white/10">
                      <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                        <th className="p-3 text-right">Count</th>
                        <th className="p-3 text-right">Percentage</th>
                        <th className="p-3">Visual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.categorySummary.map((cat) => (
                        <tr
                          key={cat.category}
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <td className="p-3 font-medium">{cat.category}</td>
                          <td className="p-3 text-right font-mono">
                            {cat.amount.toLocaleString()}
                          </td>
                          <td className="p-3 text-right">{cat.count}</td>
                          <td className="p-3 text-right">{cat.percentage.toFixed(2)}%</td>
                          <td className="p-3">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${cat.percentage}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Branch Summary */}
            {selectedBranch === "All" && (
              <div className="mb-6">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      🏢 Branch-wise Summary
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-white/10">
                        <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                          <th className="p-3">Branch</th>
                          <th className="p-3 text-right">Total Expense (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.branchSummary.map((branch) => (
                          <tr
                            key={branch.branch}
                            className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                          >
                            <td className="p-3 font-medium">{branch.branch}</td>
                            <td className="p-3 text-right font-mono">
                              {branch.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={exportToExcel}
                disabled={loading || expenses.length === 0}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                Export to Excel
              </button>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
}
