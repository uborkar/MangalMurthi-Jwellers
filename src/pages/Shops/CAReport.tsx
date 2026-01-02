// src/pages/Shops/CAReport.tsx - Chartered Accountant Report
import { useState, useEffect, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  Calendar,
  Download,
  FileText,
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  PieChart,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import ExcelJS from "exceljs";

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

type BranchName = "All" | "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";

interface Invoice {
  invoiceId: string;
  branch: string;
  customerName: string;
  items: InvoiceItem[];
  totals: {
    subtotal: number;
    totalDiscount: number;
    taxable: number;
    gst: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
  };
  createdAt: string;
}

interface InvoiceItem {
  barcode: string;
  category: string;
  weight: string;
  costPrice: number;
  sellingPrice: number;
  qty: number;
  discount: number;
  taxableAmount: number;
}

interface StockInItem {
  date: string;
  category: string;
  weight: string;
  costPrice: number;
  quantity: number;
}

interface CAReportData {
  sales: {
    totalRevenue: number;
    totalInvoices: number;
    totalItems: number;
    totalGST: number;
    totalDiscount: number;
    categoryWise: Record<string, { revenue: number; items: number; weight: number }>;
  };
  purchases: {
    totalCost: number;
    totalItems: number;
    totalWeight: number;
    categoryWise: Record<string, { cost: number; items: number; weight: number }>;
  };
  inventory: {
    openingStock: number;
    closingStock: number;
    stockValue: number;
  };
  profitLoss: {
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const BRANCHES: BranchName[] = ["All", "Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function CAReport() {
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedBranch, setSelectedBranch] = useState<BranchName>("All");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<CAReportData | null>(null);

  useEffect(() => {
    loadReportData();
  }, [dateFrom, dateTo, selectedBranch]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const branches = selectedBranch === "All" 
        ? ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"]
        : [selectedBranch];

      // Load sales data
      const allInvoices: Invoice[] = [];
      for (const branch of branches) {
        const invoicesRef = collection(db, "shops", branch, "invoices");
        const snapshot = await getDocs(invoicesRef);
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Invoice;
          const invDate = new Date(data.createdAt).toISOString().split("T")[0];
          if (invDate >= dateFrom && invDate <= dateTo) {
            allInvoices.push(data);
          }
        });
      }

      // Load stock-in data
      const stockInRef = collection(db, "warehouseItems");
      const stockInSnapshot = await getDocs(stockInRef);
      const stockInItems: StockInItem[] = [];
      stockInSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === "stocked" && data.createdAt) {
          const itemDate = new Date(data.createdAt).toISOString().split("T")[0];
          if (itemDate >= dateFrom && itemDate <= dateTo) {
            stockInItems.push({
              date: itemDate,
              category: data.category || "Unknown",
              weight: data.weight || "0",
              costPrice: data.costPrice || 0,
              quantity: 1,
            });
          }
        }
      });

      // Calculate sales metrics
      const salesCategoryWise: Record<string, { revenue: number; items: number; weight: number }> = {};
      let totalRevenue = 0;
      let totalGST = 0;
      let totalDiscount = 0;
      let totalItems = 0;

      allInvoices.forEach((inv) => {
        totalRevenue += inv.totals.grandTotal;
        totalGST += inv.totals.gst;
        totalDiscount += inv.totals.totalDiscount;
        
        inv.items.forEach((item) => {
          totalItems += item.qty;
          const cat = item.category;
          if (!salesCategoryWise[cat]) {
            salesCategoryWise[cat] = { revenue: 0, items: 0, weight: 0 };
          }
          salesCategoryWise[cat].revenue += item.taxableAmount;
          salesCategoryWise[cat].items += item.qty;
          salesCategoryWise[cat].weight += parseFloat(item.weight || "0");
        });
      });

      // Calculate purchase metrics
      const purchaseCategoryWise: Record<string, { cost: number; items: number; weight: number }> = {};
      let totalCost = 0;
      let totalPurchaseItems = 0;
      let totalWeight = 0;

      stockInItems.forEach((item) => {
        totalCost += item.costPrice;
        totalPurchaseItems += item.quantity;
        totalWeight += parseFloat(item.weight);
        
        const cat = item.category;
        if (!purchaseCategoryWise[cat]) {
          purchaseCategoryWise[cat] = { cost: 0, items: 0, weight: 0 };
        }
        purchaseCategoryWise[cat].cost += item.costPrice;
        purchaseCategoryWise[cat].items += item.quantity;
        purchaseCategoryWise[cat].weight += parseFloat(item.weight);
      });

      // Calculate inventory (simplified - would need actual stock counts)
      const openingStock = 0; // Would need historical data
      const closingStock = totalPurchaseItems - totalItems;
      const stockValue = totalCost - (totalRevenue - totalGST - totalDiscount);

      // Calculate profit/loss
      const grossProfit = totalRevenue - totalGST - totalCost;
      const netProfit = grossProfit - totalDiscount;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setReportData({
        sales: {
          totalRevenue,
          totalInvoices: allInvoices.length,
          totalItems,
          totalGST,
          totalDiscount,
          categoryWise: salesCategoryWise,
        },
        purchases: {
          totalCost,
          totalItems: totalPurchaseItems,
          totalWeight,
          categoryWise: purchaseCategoryWise,
        },
        inventory: {
          openingStock,
          closingStock,
          stockValue,
        },
        profitLoss: {
          grossProfit,
          netProfit,
          profitMargin,
        },
      });

      toast.success("CA Report generated successfully");
    } catch (error) {
      console.error("Error loading CA report:", error);
      toast.error("Failed to generate CA report");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!reportData) {
      toast.error("No data to export");
      return;
    }

    const loadingToast = toast.loading("Generating CA Report Excel...");

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Suwarnasparsh Jewellers";
      workbook.created = new Date();

      // Sheet 1: Executive Summary
      const summarySheet = workbook.addWorksheet("Executive Summary");
      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 40 },
        { header: "Value", key: "value", width: 20 },
      ];

      summarySheet.addRows([
        { metric: "CHARTERED ACCOUNTANT REPORT", value: "" },
        { metric: "Report Period", value: `${dateFrom} to ${dateTo}` },
        { metric: "Branch", value: selectedBranch },
        { metric: "Generated On", value: new Date().toLocaleString() },
        { metric: "", value: "" },
        { metric: "SALES SUMMARY", value: "" },
        { metric: "Total Revenue", value: `₹${reportData.sales.totalRevenue.toLocaleString()}` },
        { metric: "Total Invoices", value: reportData.sales.totalInvoices },
        { metric: "Total Items Sold", value: reportData.sales.totalItems },
        { metric: "Total GST Collected", value: `₹${reportData.sales.totalGST.toFixed(2)}` },
        { metric: "Total Discount Given", value: `₹${reportData.sales.totalDiscount.toFixed(2)}` },
        { metric: "", value: "" },
        { metric: "PURCHASE SUMMARY", value: "" },
        { metric: "Total Purchase Cost", value: `₹${reportData.purchases.totalCost.toLocaleString()}` },
        { metric: "Total Items Purchased", value: reportData.purchases.totalItems },
        { metric: "Total Weight (gms)", value: reportData.purchases.totalWeight.toFixed(2) },
        { metric: "", value: "" },
        { metric: "INVENTORY", value: "" },
        { metric: "Opening Stock", value: reportData.inventory.openingStock },
        { metric: "Closing Stock", value: reportData.inventory.closingStock },
        { metric: "Stock Value", value: `₹${reportData.inventory.stockValue.toFixed(2)}` },
        { metric: "", value: "" },
        { metric: "PROFIT & LOSS", value: "" },
        { metric: "Gross Profit", value: `₹${reportData.profitLoss.grossProfit.toFixed(2)}` },
        { metric: "Net Profit", value: `₹${reportData.profitLoss.netProfit.toFixed(2)}` },
        { metric: "Profit Margin (%)", value: `${reportData.profitLoss.profitMargin.toFixed(2)}%` },
      ]);

      // Sheet 2: Sales Category-wise
      const salesCatSheet = workbook.addWorksheet("Sales by Category");
      salesCatSheet.columns = [
        { header: "Category", key: "category", width: 25 },
        { header: "Revenue (₹)", key: "revenue", width: 15 },
        { header: "Items Sold", key: "items", width: 12 },
        { header: "Weight (gms)", key: "weight", width: 15 },
      ];

      Object.entries(reportData.sales.categoryWise).forEach(([cat, data]) => {
        salesCatSheet.addRow({
          category: cat,
          revenue: data.revenue,
          items: data.items,
          weight: data.weight.toFixed(2),
        });
      });

      // Sheet 3: Purchase Category-wise
      const purchaseCatSheet = workbook.addWorksheet("Purchases by Category");
      purchaseCatSheet.columns = [
        { header: "Category", key: "category", width: 25 },
        { header: "Cost (₹)", key: "cost", width: 15 },
        { header: "Items Purchased", key: "items", width: 15 },
        { header: "Weight (gms)", key: "weight", width: 15 },
      ];

      Object.entries(reportData.purchases.categoryWise).forEach(([cat, data]) => {
        purchaseCatSheet.addRow({
          category: cat,
          cost: data.cost,
          items: data.items,
          weight: data.weight.toFixed(2),
        });
      });

      // Style headers
      [summarySheet, salesCatSheet, purchaseCatSheet].forEach((sheet) => {
        sheet.getRow(1).font = { bold: true, size: 12 };
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
      link.download = `CA_Report_${selectedBranch}_${dateFrom}_to_${dateTo}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("CA Report downloaded!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to generate Excel report");
    }
  };

  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="CA Report - Chartered Accountant Report"
        description="Comprehensive financial report for accounting purposes"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 Chartered Accountant Report"
            subtitle="Comprehensive Financial Analysis for Accounting"
          >
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
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
                  Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchName)}
                  className={inputStyle}
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-gray-500 dark:text-gray-400">Generating CA Report...</p>
              </div>
            )}

            {!loading && reportData && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <DollarSign size={24} />
                      <span className="text-xs opacity-80">Revenue</span>
                    </div>
                    <div className="text-2xl font-bold">
                      ₹{reportData.sales.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-xs opacity-80 mt-1">Total Sales</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Package size={24} />
                      <span className="text-xs opacity-80">Purchases</span>
                    </div>
                    <div className="text-2xl font-bold">
                      ₹{reportData.purchases.totalCost.toLocaleString()}
                    </div>
                    <div className="text-xs opacity-80 mt-1">Total Cost</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp size={24} />
                      <span className="text-xs opacity-80">Profit</span>
                    </div>
                    <div className="text-2xl font-bold">
                      ₹{reportData.profitLoss.netProfit.toFixed(0)}
                    </div>
                    <div className="text-xs opacity-80 mt-1">Net Profit</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 size={24} />
                      <span className="text-xs opacity-80">Margin</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {reportData.profitLoss.profitMargin.toFixed(2)}%
                    </div>
                    <div className="text-xs opacity-80 mt-1">Profit Margin</div>
                  </div>
                </div>

                {/* Sales & Purchase Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Sales Summary */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={20} className="text-green-600 dark:text-green-400" />
                        Sales Summary
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Invoices</span>
                        <span className="font-semibold">{reportData.sales.totalInvoices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Items Sold</span>
                        <span className="font-semibold">{reportData.sales.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">GST Collected</span>
                        <span className="font-semibold">₹{reportData.sales.totalGST.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Discount Given</span>
                        <span className="font-semibold text-red-600">₹{reportData.sales.totalDiscount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Summary */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package size={20} className="text-blue-600 dark:text-blue-400" />
                        Purchase Summary
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Items Purchased</span>
                        <span className="font-semibold">{reportData.purchases.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Weight</span>
                        <span className="font-semibold">{reportData.purchases.totalWeight.toFixed(2)}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Cost</span>
                        <span className="font-semibold">₹{reportData.purchases.totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category-wise Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Sales by Category */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <PieChart size={20} className="text-green-600 dark:text-green-400" />
                        Sales by Category
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-white/10">
                          <tr className="text-left">
                            <th className="p-3">Category</th>
                            <th className="p-3 text-right">Revenue</th>
                            <th className="p-3 text-right">Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.sales.categoryWise)
                            .sort(([, a], [, b]) => b.revenue - a.revenue)
                            .map(([cat, data]) => (
                              <tr
                                key={cat}
                                className="border-b border-gray-200 dark:border-gray-800"
                              >
                                <td className="p-3 font-medium">{cat}</td>
                                <td className="p-3 text-right">₹{data.revenue.toLocaleString()}</td>
                                <td className="p-3 text-right">{data.items}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Purchases by Category */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <PieChart size={20} className="text-blue-600 dark:text-blue-400" />
                        Purchases by Category
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-white/10">
                          <tr className="text-left">
                            <th className="p-3">Category</th>
                            <th className="p-3 text-right">Cost</th>
                            <th className="p-3 text-right">Items</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(reportData.purchases.categoryWise)
                            .sort(([, a], [, b]) => b.cost - a.cost)
                            .map(([cat, data]) => (
                              <tr
                                key={cat}
                                className="border-b border-gray-200 dark:border-gray-800"
                              >
                                <td className="p-3 font-medium">{cat}</td>
                                <td className="p-3 text-right">₹{data.cost.toLocaleString()}</td>
                                <td className="p-3 text-right">{data.items}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Export Button */}
                <div className="flex justify-end">
                  <button
                    onClick={exportToExcel}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <Download size={18} />
                    Export CA Report (Excel)
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
