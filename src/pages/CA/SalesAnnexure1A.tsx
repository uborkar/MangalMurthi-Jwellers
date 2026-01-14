// src/pages/CA/SalesAnnexure1A.tsx - Sales Register (Annexure 1A)
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Calendar, Download, Filter, Store } from "lucide-react";
import {
  getSalesRecords,
  getCustomerWiseSummary,
  getProductWiseSalesSummary,
  calculateGSTSummary,
} from "../../firebase/caReports";
import { SalesRecord, GSTSummary } from "../../types/caReports";
import ExcelJS from "exceljs";

type ViewMode = "customerwise" | "productwise" | "detailed";

export default function SalesAnnexure1A() {
  const [viewMode, setViewMode] = useState<ViewMode>("customerwise");
  const [loading, setLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [shopFilter, setShopFilter] = useState<string>("All");

  // Data
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [gstSummary, setGstSummary] = useState<GSTSummary | null>(null);

  const shops = ["All", "Sangli", "Miraj", "Kolhapur"];

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo, shopFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {
        dateFrom,
        dateTo,
        shopName: shopFilter === "All" ? undefined : shopFilter,
      };

      const data = await getSalesRecords(filters);
      setRecords(data);
      setGstSummary(calculateGSTSummary(data));

      if (data.length === 0) {
        toast("No sales records found for selected period", { icon: "ℹ️" });
      } else {
        toast.success(`Loaded ${data.length} sales records`);
      }
    } catch (error) {
      console.error("Error loading sales data:", error);
      toast.error("Failed to load sales records");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!records || records.length === 0) {
      toast.error("No records to export");
      return;
    }

    if (!gstSummary) {
      toast.error("GST summary data not available");
      return;
    }

    const loadingToast = toast.loading("Generating Excel report...");

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Suwarnasparsh Jewellers";
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet("GST Summary");
      summarySheet.columns = [
        { header: "Particulars", key: "particulars", width: 30 },
        { header: "Amount (Rs.)", key: "amount", width: 20 },
      ];

      summarySheet.addRows([
        { particulars: "Report Period", amount: `${dateFrom} to ${dateTo}` },
        { particulars: "Shop Filter", amount: shopFilter },
        { particulars: "Total Records", amount: gstSummary.recordCount || 0 },
        { particulars: "", amount: "" },
        { particulars: "Taxable Value", amount: (gstSummary.totalTaxableValue || 0).toFixed(2) },
        { particulars: "CGST", amount: (gstSummary.totalCGST || 0).toFixed(2) },
        { particulars: "SGST", amount: (gstSummary.totalSGST || 0).toFixed(2) },
        { particulars: "IGST", amount: (gstSummary.totalIGST || 0).toFixed(2) },
        { particulars: "Total Sales Value", amount: (gstSummary.totalInvoiceValue || 0).toFixed(2) },
      ]);

      // Sheet 2: Detailed Records
      const detailSheet = workbook.addWorksheet("Sales Register");
      detailSheet.columns = [
        { header: "Date", key: "date", width: 12 },
        { header: "Shop", key: "shop", width: 15 },
        { header: "Customer Name", key: "customerName", width: 25 },
        { header: "GSTIN", key: "gstin", width: 18 },
        { header: "Invoice No", key: "invoiceNo", width: 15 },
        { header: "Product", key: "product", width: 30 },
        { header: "HSN", key: "hsn", width: 10 },
        { header: "Qty", key: "qty", width: 8 },
        { header: "Rate", key: "rate", width: 12 },
        { header: "Taxable Value", key: "taxableValue", width: 15 },
        { header: "CGST", key: "cgst", width: 12 },
        { header: "SGST", key: "sgst", width: 12 },
        { header: "IGST", key: "igst", width: 12 },
        { header: "Total", key: "total", width: 15 },
      ];

      records.forEach((record) => {
        detailSheet.addRow({
          date: record.date ? new Date(record.date).toLocaleDateString() : "-",
          shop: record.shopName || "-",
          customerName: record.customerName || "-",
          gstin: record.customerGSTIN || "-",
          invoiceNo: record.invoiceNumber || "-",
          product: record.productDescription || "-",
          hsn: record.hsnCode || "-",
          qty: record.quantity || 0,
          rate: (record.rate || 0).toFixed(2),
          taxableValue: (record.taxableValue || 0).toFixed(2),
          cgst: (record.cgstAmount || 0).toFixed(2),
          sgst: (record.sgstAmount || 0).toFixed(2),
          igst: (record.igstAmount || 0).toFixed(2),
          total: (record.totalValue || 0).toFixed(2),
        });
      });

      // Style headers
      [summarySheet, detailSheet].forEach((sheet) => {
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        headerRow.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Sales_Annexure_1A_${dateFrom}_to_${dateTo}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("Excel report downloaded!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to generate Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Sales Annexure 1A"
        description="Customer-wise & Product-wise Sales Register"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📋 Sales Annexure 1A - Sales Register"
            subtitle="GST-Compliant Sales Register with CGST, SGST, IGST Breakdowns"
          >
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div>
                <label className="block text-sm font-semibold mb-2 text-green-800 dark:text-green-400">
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
                <label className="block text-sm font-semibold mb-2 text-green-800 dark:text-green-400">
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
                <label className="block text-sm font-semibold mb-2 text-green-800 dark:text-green-400">
                  <Store className="inline mr-1" size={14} />
                  Shop
                </label>
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className={inputStyle}
                >
                  {shops.map((shop) => (
                    <option key={shop} value={shop}>
                      {shop}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-green-800 dark:text-green-400">
                  <Filter className="inline mr-1" size={14} />
                  View Mode
                </label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className={inputStyle}
                >
                  <option value="customerwise">Customer-wise</option>
                  <option value="productwise">Product-wise</option>
                  <option value="detailed">Detailed Register</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={exportToExcel}
                  disabled={loading || records.length === 0}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  Export Excel
                </button>
              </div>
            </div>

            {/* GST Summary Cards */}
            {gstSummary && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taxable Value</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ₹{gstSummary.totalTaxableValue.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">CGST</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    ₹{gstSummary.totalCGST.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">SGST</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    ₹{gstSummary.totalSGST.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">IGST</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    ₹{gstSummary.totalIGST.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Total Sales Value</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    ₹{gstSummary.totalInvoiceValue.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  📊 Sales Register
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    ({records.length} records)
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : records.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No sales records found for the selected period
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-white/10">
                      <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                        <th className="p-3">Date</th>
                        <th className="p-3">Shop</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Taxable Value</th>
                        <th className="p-3 text-right">CGST</th>
                        <th className="p-3 text-right">SGST</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <td className="p-3">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                              {record.shopName}
                            </span>
                          </td>
                          <td className="p-3">{record.customerName}</td>
                          <td className="p-3 font-mono text-xs">{record.invoiceNumber}</td>
                          <td className="p-3">{record.productDescription}</td>
                          <td className="p-3 text-right font-mono">₹{record.taxableValue.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">₹{record.cgstAmount.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">₹{record.sgstAmount.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-semibold">₹{record.totalValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
}