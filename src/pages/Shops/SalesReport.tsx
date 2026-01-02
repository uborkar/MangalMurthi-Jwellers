// src/pages/Shops/SalesReport.tsx - Professional Sales Analytics & Reports
import { useEffect, useState, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  FileSpreadsheet,
} from "lucide-react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import * as XLSX from "xlsx";
import { getBranchLedger, getBranchLedgerSummary, flattenLedgerForExport, LedgerEntry } from "../../firebase/ledger";

type BranchName = "All" | "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";

interface Invoice {
  invoiceId: string;
  branch: string;
  customerName: string;
  customerPhone?: string;
  salespersonName?: string;
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
  gstRate: number;
  createdAt: string;
}

interface InvoiceItem {
  barcode: string;
  category: string;
  subcategory?: string;
  weight: string;
  costPrice: number;
  sellingPrice: number;
  qty: number;
  discount: number;
  taxableAmount: number;
}

interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  totalCustomers: number;
  avgOrderValue: number;
  totalDiscount: number;
  totalGST: number;
  // Ledger stats
  totalBookings?: number;
  totalAdvances?: number;
  totalPending?: number;
  ledgerBalance?: number;
}

interface CategorySales {
  category: string;
  sales: number;
  revenue: number;
  items: number;
  percentage: number;
}

interface SalespersonPerformance {
  name: string;
  sales: number;
  revenue: number;
  customers: number;
  avgOrderValue: number;
}

const BRANCHES: BranchName[] = ["All", "Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

export default function SalesReport() {
  const [selectedBranch, setSelectedBranch] = useState<BranchName>("All");
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [showLedger, setShowLedger] = useState(false);

  // Load invoices
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const allInvoices: Invoice[] = [];
      const branches = selectedBranch === "All" 
        ? ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"]
        : [selectedBranch];

      for (const branch of branches) {
        const invoicesRef = collection(db, "shops", branch, "invoices");
        const snapshot = await getDocs(invoicesRef);
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Invoice;
          allInvoices.push(data);
        });
      }

      // Filter by date range
      const filtered = allInvoices.filter((inv) => {
        const invDate = new Date(inv.createdAt).toISOString().split("T")[0];
        return invDate >= dateFrom && invDate <= dateTo;
      });

      setInvoices(filtered);
      toast.success(`Loaded ${filtered.length} invoices`);
      
      // Load ledger data
      await loadLedgerData();
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  // Load ledger data
  const loadLedgerData = async () => {
    try {
      const branches = selectedBranch === "All" 
        ? ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"]
        : [selectedBranch];

      const allLedgerEntries: LedgerEntry[] = [];

      for (const branch of branches) {
        try {
          const entries = await getBranchLedger(branch, dateFrom, dateTo);
          allLedgerEntries.push(...entries);
        } catch (error) {
          console.log(`No ledger data for ${branch}`);
        }
      }

      setLedgerEntries(allLedgerEntries);
    } catch (error) {
      console.error("Error loading ledger:", error);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [selectedBranch, dateFrom, dateTo]);

  // Calculate statistics
  const stats: SalesStats = useMemo(() => {
    const baseStats = {
      totalSales: invoices.length,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0),
      totalItems: invoices.reduce(
        (sum, inv) => sum + inv.items.reduce((s, item) => s + item.qty, 0),
        0
      ),
      totalCustomers: new Set(invoices.map((inv) => inv.customerPhone || inv.customerName))
        .size,
      avgOrderValue:
        invoices.length > 0
          ? invoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0) / invoices.length
          : 0,
      totalDiscount: invoices.reduce((sum, inv) => sum + inv.totals.totalDiscount, 0),
      totalGST: invoices.reduce((sum, inv) => sum + inv.totals.gst, 0),
    };

    // Add ledger stats
    const bookings = ledgerEntries.filter((e) => e.type === "booking");
    const totalAdvances = bookings.reduce((sum, e) => sum + (e.advanceAmount || 0), 0);
    const totalPending = ledgerEntries.reduce((sum, e) => sum + (e.pendingAmount || 0), 0);
    const ledgerBalance = ledgerEntries.reduce((sum, e) => sum + e.debit - e.credit, 0);

    return {
      ...baseStats,
      totalBookings: bookings.length,
      totalAdvances,
      totalPending,
      ledgerBalance,
    };
  }, [invoices, ledgerEntries]);

  // Category-wise sales
  const categorySales: CategorySales[] = useMemo(() => {
    const categoryMap: Record<string, { sales: number; revenue: number; items: number }> = {};

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = { sales: 0, revenue: 0, items: 0 };
        }
        categoryMap[item.category].sales += 1;
        categoryMap[item.category].revenue += item.taxableAmount;
        categoryMap[item.category].items += item.qty;
      });
    });

    const totalRevenue = Object.values(categoryMap).reduce((sum, cat) => sum + cat.revenue, 0);

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        sales: data.sales,
        revenue: data.revenue,
        items: data.items,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices]);

  // Salesperson performance
  const salespersonPerformance: SalespersonPerformance[] = useMemo(() => {
    const salesMap: Record<
      string,
      { sales: number; revenue: number; customers: Set<string> }
    > = {};

    invoices.forEach((inv) => {
      const name = inv.salespersonName || "Unknown";
      if (!salesMap[name]) {
        salesMap[name] = { sales: 0, revenue: 0, customers: new Set() };
      }
      salesMap[name].sales += 1;
      salesMap[name].revenue += inv.totals.grandTotal;
      salesMap[name].customers.add(inv.customerPhone || inv.customerName);
    });

    return Object.entries(salesMap)
      .map(([name, data]) => ({
        name,
        sales: data.sales,
        revenue: data.revenue,
        customers: data.customers.size,
        avgOrderValue: data.sales > 0 ? data.revenue / data.sales : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices]);

  // Export to Excel
  const exportToExcel = () => {
    if (invoices.length === 0) {
      toast.error("No data to export");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      { Metric: "Total Sales", Value: stats.totalSales },
      { Metric: "Total Revenue", Value: `₹${stats.totalRevenue.toLocaleString()}` },
      { Metric: "Total Items Sold", Value: stats.totalItems },
      { Metric: "Total Customers", Value: stats.totalCustomers },
      { Metric: "Average Order Value", Value: `₹${stats.avgOrderValue.toFixed(2)}` },
      { Metric: "Total Discount", Value: `₹${stats.totalDiscount.toFixed(2)}` },
      { Metric: "Total GST", Value: `₹${stats.totalGST.toFixed(2)}` },
      {},
      { Metric: "Branch", Value: selectedBranch },
      { Metric: "Date From", Value: dateFrom },
      { Metric: "Date To", Value: dateTo },
      { Metric: "Generated On", Value: new Date().toLocaleString() },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Category Sales Sheet
    const categoryData = categorySales.map((cat) => ({
      Category: cat.category,
      Sales: cat.sales,
      Revenue: cat.revenue,
      Items: cat.items,
      "Percentage (%)": cat.percentage.toFixed(2),
    }));
    const categorySheet = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Category Sales");

    // Salesperson Performance Sheet
    const salespersonData = salespersonPerformance.map((sp) => ({
      Salesperson: sp.name,
      Sales: sp.sales,
      Revenue: sp.revenue,
      Customers: sp.customers,
      "Avg Order Value": sp.avgOrderValue.toFixed(2),
    }));
    const salespersonSheet = XLSX.utils.json_to_sheet(salespersonData);
    XLSX.utils.book_append_sheet(workbook, salespersonSheet, "Salesperson Performance");

    // Detailed Invoices Sheet
    const invoiceData = invoices.map((inv) => ({
      "Invoice ID": inv.invoiceId,
      Branch: inv.branch,
      Date: new Date(inv.createdAt).toLocaleString(),
      Customer: inv.customerName,
      Phone: inv.customerPhone || "-",
      Salesperson: inv.salespersonName || "-",
      Items: inv.items.length,
      Subtotal: inv.totals.subtotal,
      Discount: inv.totals.totalDiscount,
      GST: inv.totals.gst,
      "Grand Total": inv.totals.grandTotal,
    }));
    const invoiceSheet = XLSX.utils.json_to_sheet(invoiceData);
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, "Invoices");

    // Ledger Sheet (if available)
    if (ledgerEntries.length > 0) {
      const ledgerData = flattenLedgerForExport(ledgerEntries);
      const ledgerSheet = XLSX.utils.json_to_sheet(ledgerData);
      XLSX.utils.book_append_sheet(workbook, ledgerSheet, "Ledger");

      // Pending Amounts Sheet
      const pendingData = ledgerEntries
        .filter((e) => e.pendingAmount && e.pendingAmount > 0)
        .map((e) => ({
          "Entry No": e.entryNo,
          Date: new Date(e.date).toLocaleDateString(),
          Type: e.type,
          "Party Name": e.partyName,
          Phone: e.partyPhone || "-",
          "Total Amount": e.totalAmount || 0,
          "Advance Amount": e.advanceAmount || 0,
          "Pending Amount": e.pendingAmount || 0,
          Salesperson: e.salesperson || "-",
        }));
      
      if (pendingData.length > 0) {
        const pendingSheet = XLSX.utils.json_to_sheet(pendingData);
        XLSX.utils.book_append_sheet(workbook, pendingSheet, "Pending Amounts");
      }
    }

    // Download
    XLSX.writeFile(
      workbook,
      `SalesReport_${selectedBranch}_${dateFrom}_to_${dateTo}.xlsx`
    );
    toast.success("Excel report downloaded!");
  };

  return (
    <>
      <PageMeta
        title="Sales Report - Analytics"
        description="Comprehensive sales analytics and reports"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 Sales Report & Analytics"
            subtitle="Comprehensive sales performance analysis"
          >
            {/* Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Filter size={18} />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </button>

                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors flex items-center gap-2"
                >
                  <Download size={18} />
                  Export Excel
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                      Branch
                    </label>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value as BranchName)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                      <Calendar className="inline mr-1" size={14} />
                      Date From
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                      <Calendar className="inline mr-1" size={14} />
                      Date To
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Key Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl mb-3">
                  <ShoppingBag className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Sales</span>
                <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">
                  {stats.totalSales}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invoices</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl mb-3">
                  <DollarSign className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</span>
                <h4 className="mt-2 font-bold text-green-600 text-2xl dark:text-green-400">
                  ₹{stats.totalRevenue.toLocaleString()}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Avg: ₹{stats.avgOrderValue.toFixed(0)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mb-3">
                  <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Items Sold</span>
                <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">
                  {stats.totalItems}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Units</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl mb-3">
                  <Users className="text-orange-600 dark:text-orange-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Customers</span>
                <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">
                  {stats.totalCustomers}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unique</p>
              </div>
            </div>

            {/* Ledger Summary Cards */}
            {ledgerEntries.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 dark:border-purple-800 dark:bg-purple-900/20">
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mb-3">
                    <FileSpreadsheet className="text-purple-600 dark:text-purple-400" size={24} />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Bookings</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">
                    {stats.totalBookings || 0}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Advance orders</p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl mb-3">
                    <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Advances</span>
                  <h4 className="mt-2 font-bold text-blue-600 text-2xl dark:text-blue-400">
                    ₹{(stats.totalAdvances || 0).toLocaleString()}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Received</p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl mb-3">
                    <TrendingUp className="text-red-600 dark:text-red-400" size={24} />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Pending Amount</span>
                  <h4 className="mt-2 font-bold text-red-600 text-2xl dark:text-red-400">
                    ₹{(stats.totalPending || 0).toLocaleString()}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">To be collected</p>
                </div>

                <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl mb-3">
                    <BarChart3 className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Ledger Balance</span>
                  <h4 className="mt-2 font-bold text-green-600 text-2xl dark:text-green-400">
                    ₹{(stats.ledgerBalance || 0).toLocaleString()}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Net position</p>
                </div>
              </div>
            )}

            {/* Category Sales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-blue-600 dark:text-blue-400" />
                  Category-wise Sales
                </h3>
                <div className="space-y-3">
                  {categorySales.slice(0, 5).map((cat) => (
                    <div key={cat.category}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {cat.category}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          ₹{cat.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {cat.items} items
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salesperson Performance */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-green-600 dark:text-green-400" />
                  Top Salespersons
                </h3>
                <div className="space-y-4">
                  {salespersonPerformance.slice(0, 5).map((sp, index) => (
                    <div
                      key={sp.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {sp.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {sp.sales} sales • {sp.customers} customers
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          ₹{sp.revenue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Avg: ₹{sp.avgOrderValue.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-purple-600 dark:text-purple-400" />
                  Recent Invoices
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                      <th className="p-3 text-xs">Invoice ID</th>
                      <th className="p-3 text-xs">Date</th>
                      <th className="p-3 text-xs">Branch</th>
                      <th className="p-3 text-xs">Customer</th>
                      <th className="p-3 text-xs">Salesperson</th>
                      <th className="p-3 text-xs">Items</th>
                      <th className="p-3 text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 10).map((inv) => (
                      <tr
                        key={inv.invoiceId}
                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <td className="p-3 font-mono text-xs text-blue-600 dark:text-blue-400">
                          {inv.invoiceId.split("-").pop()}
                        </td>
                        <td className="p-3 text-xs text-gray-600 dark:text-gray-400">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-xs">{inv.branch}</td>
                        <td className="p-3 text-xs">{inv.customerName}</td>
                        <td className="p-3 text-xs">{inv.salespersonName || "-"}</td>
                        <td className="p-3 text-xs">{inv.items.length}</td>
                        <td className="p-3 text-xs font-semibold text-green-600 dark:text-green-400">
                          ₹{inv.totals.grandTotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-gray-500 dark:text-gray-400">Loading sales data...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && invoices.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-500 dark:text-gray-400">
                  No sales data found for the selected period
                </p>
              </div>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
