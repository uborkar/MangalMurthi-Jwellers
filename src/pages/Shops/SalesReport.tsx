import React, { useState, useEffect, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import { Download, Filter, RefreshCw } from "lucide-react";
import Chart from "react-apexcharts";
import { getFilteredInvoices, InvoiceWithId } from "../../firebase/invoices";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

const branches = ["Sangli", "Miraj", "Kolhapur"];

export default function SalesReport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branch, setBranch] = useState("");
  const [salesman, setSalesman] = useState("");
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [loading, setLoading] = useState(false);

  // Load invoices on mount
  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await getFilteredInvoices({});
      setInvoices(data);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const data = await getFilteredInvoices({
        branch: branch || undefined,
        salesman: salesman || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setInvoices(data);
      toast.success("Filters applied");
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Failed to apply filters");
    } finally {
      setLoading(false);
    }
  };

  // Get unique salesmen from invoices
  const salesmen = useMemo(() => {
    const uniqueSalesmen = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.salesman) uniqueSalesmen.add(inv.salesman);
    });
    return Array.from(uniqueSalesmen).sort();
  }, [invoices]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalSales = invoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
    const totalGST = invoices.reduce((sum, inv) => sum + inv.totals.gstTotal, 0);
    const totalInvoices = invoices.length;
    const avgInvoice = totalInvoices > 0 ? totalSales / totalInvoices : 0;

    return {
      totalSales,
      totalGST,
      totalInvoices,
      avgInvoice,
    };
  }, [invoices]);

  // Prepare chart data - Daily sales (last 7 days)
  const dailyChartData = useMemo(() => {
    const last7Days: string[] = [];
    const salesByDay: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));

      const daySales = invoices
        .filter(inv => inv.createdAt.startsWith(dateStr))
        .reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
      
      salesByDay.push(daySales);
    }

    return { categories: last7Days, data: salesByDay };
  }, [invoices]);

  // Category analysis
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};

    invoices.forEach((invoice) => {
      invoice.rows.forEach((row) => {
        const category = row.productName || "Others";
        categories[category] = (categories[category] || 0) + row.taxableAmount;
      });
    });

    const labels = Object.keys(categories).slice(0, 5);
    const series = Object.values(categories).slice(0, 5);

    return { labels, series };
  }, [invoices]);

  // -------------------- CHARTS ----------------------

  const dailySalesOptions = {
    chart: { type: "line", toolbar: { show: false }, fontFamily: "Outfit" },
    stroke: { curve: "smooth", width: 3 },
    colors: ["#465fff"],
    xaxis: {
      categories: dailyChartData.categories,
      labels: { style: { colors: "#6b7280" } }
    },
    grid: { borderColor: "#e5e7eb30" }
  };

  const dailySalesSeries = [
    { name: "Sales (₹)", data: dailyChartData.data },
  ];

  const categoryChart = {
    chart: { type: "donut" },
    labels: categoryData.labels.length > 0 ? categoryData.labels : ["No Data"],
    colors: ["#6366f1", "#22c55e", "#f97316", "#ef4444", "#a855f7"],
    legend: { position: "bottom" },
    plotOptions: { pie: { donut: { size: "65%" } } }
  };

  const categorySeries = categoryData.series.length > 0 ? categoryData.series : [1];

  // -------------------- EXPORT ACTIONS ----------------------

  const exportExcel = () => {
    if (invoices.length === 0) {
      toast.error("No data to export");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const excelData: any[] = invoices.map((inv, idx) => ({
      "Sr No": idx + 1,
      "Invoice ID": inv.id,
      "Date": new Date(inv.createdAt).toLocaleDateString(),
      "Branch": inv.branch,
      "Customer": inv.customerName || "-",
      "Salesman": inv.salesman || "-",
      "Items": inv.rows.length,
      "Subtotal": inv.totals.subtotal,
      "Discount": inv.totals.totalDiscount,
      "Taxable": inv.totals.taxable,
      "GST": inv.totals.gstTotal,
      "Grand Total": inv.totals.grandTotal,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

    const fileName = `SalesReport_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel downloaded");
  };

  const exportPDF = () => {
    if (invoices.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("SALES REPORT", 105, 15, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
    doc.text(`Total Invoices: ${kpis.totalInvoices}`, 14, 32);
    doc.text(`Total Sales: ₹${kpis.totalSales.toFixed(2)}`, 14, 39);

    const tableData = invoices.map((inv, idx) => [
      idx + 1,
      inv.id.substring(0, 8),
      new Date(inv.createdAt).toLocaleDateString(),
      inv.branch,
      inv.customerName || "-",
      inv.salesman || "-",
      `₹${inv.totals.grandTotal.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["#", "Invoice", "Date", "Branch", "Customer", "Salesman", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });

    const fileName = `SalesReport_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded");
  };

  return (
    <>
      <PageMeta
        title="Sales Report"
        description="Daily, Monthly & Salesman Analysis with GST Summary"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 Sales Analytics Dashboard"
            subtitle="Track branch sales, salesman performance & invoice analytics"
          >
            {/* ------------ KPI CARDS ------------ */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Sales</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    ₹{kpis.totalSales.toLocaleString()}
                  </h4>
                </div>
              </div>

              <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total GST</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    ₹{kpis.totalGST.toLocaleString()}
                  </h4>
                </div>
              </div>

              <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">📃</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Invoices</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {kpis.totalInvoices}
                  </h4>
                </div>
              </div>

              <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Avg. Invoice</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    ₹{kpis.avgInvoice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </h4>
                </div>
              </div>
            </div>

            {/* ------------ FILTERS ------------ */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800 dark:text-white/90">
                  <Filter size={20} /> Filters
                </h2>
                <button
                  onClick={loadInvoices}
                  disabled={loading}
                  className="px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-800"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input 
                  type="date" 
                  className={inputClass} 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                />
                <input 
                  type="date" 
                  className={inputClass} 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                />

                <select className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="">All Branches</option>
                  {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>

                <select className={inputClass} value={salesman} onChange={(e) => setSalesman(e.target.value)}>
                  <option value="">All Salesmen</option>
                  {salesmen.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button 
                onClick={applyFilters}
                disabled={loading}
                className="mt-4 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 font-medium transition-colors"
              >
                {loading ? "Loading..." : "Apply Filters"}
              </button>
            </div>

            {/* ------------ CHARTS ------------ */}
            <div className="grid grid-cols-12 gap-6">
              {/* Daily Sales */}
              <div className="col-span-12 xl:col-span-7 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white/90">
                  📈 Daily Sales Trend
                </h3>
                <Chart
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={dailySalesOptions as any}
                  series={dailySalesSeries}
                  type="line"
                  height={260}
                />
              </div>

              {/* Category Strength */}
              <div className="col-span-12 xl:col-span-5 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white/90">
                  💍 Category Contribution
                </h3>
                <Chart
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={categoryChart as any}
                  series={categorySeries}
                  type="donut"
                  height={260}
                />
              </div>
            </div>

            {/* ------------ TABLE  ------------ */}
            <div className="mt-8 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  Invoice List ({invoices.length})
                </h2>

                <div className="flex gap-3">
                  <button 
                    onClick={exportExcel} 
                    disabled={invoices.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download size={16} /> Excel
                  </button>
                  <button 
                    onClick={exportPDF} 
                    disabled={invoices.length === 0}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download size={16} /> PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.08]">
                    <tr>
                      {["#", "Invoice ID", "Date", "Branch", "Customer", "Salesman", "Items", "Total", "GST"].map((h) => (
                        <th key={h} className="border p-2 text-left text-gray-700 dark:text-gray-300">{h}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-gray-600 dark:text-gray-300">
                          Loading invoices...
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-gray-600 dark:text-gray-300">
                          No invoices found. Try adjusting filters or create new invoices.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice, idx) => (
                        <tr key={invoice.id} className="border-t dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300">{idx + 1}</td>
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs">
                            {invoice.id.substring(0, 12)}...
                          </td>
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                            {new Date(invoice.createdAt).toLocaleDateString()}
                          </td>
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                              {invoice.branch}
                            </span>
                          </td>
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                            {invoice.customerName || "-"}
                          </td>
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                            {invoice.salesman || "-"}
                          </td>
                          <td className="border p-2 dark:border-gray-800 text-center text-gray-700 dark:text-gray-300">
                            {invoice.rows.length}
                          </td>
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
                            ₹{invoice.totals.grandTotal.toLocaleString()}
                          </td>
                          <td className="border p-2 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                            ₹{invoice.totals.gstTotal.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
}
