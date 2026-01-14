// src/pages/CA/PurchaseAnnexure2A.tsx - Purchase Return Register (Annexure 2A)
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Calendar, Download, Filter } from "lucide-react";
import {
  getPurchaseReturnRecords,
  calculateGSTSummary,
} from "../../firebase/caReports";
import { PurchaseReturnRecord, GSTSummary } from "../../types/caReports";
import ExcelJS from "exceljs";

type ViewMode = "supplierwise" | "productwise" | "detailed";

export default function PurchaseAnnexure2A() {
  const [viewMode, setViewMode] = useState<ViewMode>("supplierwise");
  const [loading, setLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  // Data
  const [records, setRecords] = useState<PurchaseReturnRecord[]>([]);
  const [gstSummary, setGstSummary] = useState<GSTSummary | null>(null);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseReturnRecords({ dateFrom, dateTo });
      setRecords(data);
      setGstSummary(calculateGSTSummary(data));
      
      if (data.length === 0) {
        toast("No purchase return records found for selected period", { icon: "ℹ️" });
      } else {
        toast.success(`Loaded ${data.length} purchase return records`);
      }
    } catch (error) {
      console.error("Error loading purchase return data:", error);
      toast.error("Failed to load purchase return records");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    const loadingToast = toast.loading("Generating Excel report...");

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Suwarnasparsh Jewellers";
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet("GST Summary");
      summarySheet.columns = [
        { header: "Particulars", key: "particulars", width: 30 },
        { header: "Amount (₹)", key: "amount", width: 20 },
      ];

      summarySheet.addRows([
        { particulars: "Report Period", amount: `${dateFrom} to ${dateTo}` },
        { particulars: "Total Return Records", amount: gstSummary?.recordCount || 0 },
        { particulars: "", amount: "" },
        { particulars: "Taxable Value", amount: gstSummary?.totalTaxableValue.toFixed(2) || 0 },
        { particulars: "CGST", amount: gstSummary?.totalCGST.toFixed(2) || 0 },
        { particulars: "SGST", amount: gstSummary?.totalSGST.toFixed(2) || 0 },
        { particulars: "IGST", amount: gstSummary?.totalIGST.toFixed(2) || 0 },
        { particulars: "Total Return Value", amount: gstSummary?.totalInvoiceValue.toFixed(2) || 0 },
      ]);

      // Sheet 2: Detailed Records
      const detailSheet = workbook.addWorksheet("Purchase Return Register");
      detailSheet.columns = [
        { header: "Return Date", key: "returnDate", width: 12 },
        { header: "Supplier Name", key: "supplierName", width: 25 },
        { header: "GSTIN", key: "gstin", width: 18 },
        { header: "Original Invoice", key: "originalInvoice", width: 15 },
        { header: "Product", key: "product", width: 30 },
        { header: "Return Reason", key: "returnReason", width: 20 },
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
          returnDate: new Date(record.returnDate).toLocaleDateString(),
          supplierName: record.supplierName,
          gstin: record.supplierGSTIN || "-",
          originalInvoice: record.originalInvoiceNumber,
          product: record.productDescription,
          returnReason: record.returnReason || "-",
          qty: record.quantity,
          rate: record.rate.toFixed(2),
          taxableValue: record.taxableValue.toFixed(2),
          cgst: record.cgstAmount.toFixed(2),
          sgst: record.sgstAmount.toFixed(2),
          igst: record.igstAmount.toFixed(2),
          total: record.totalValue.toFixed(2),
        });
      });

      // Style headers
      [summarySheet, detailSheet].forEach((sheet) => {
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
      link.download = `Purchase_Return_Annexure_2A_${dateFrom}_to_${dateTo}.xlsx`;
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

  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Purchase Annexure 2A"
        description="Supplier-wise & Product-wise Purchase Return Register"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📋 Purchase Annexure 2A - Purchase Return Register"
            subtitle="GST-Compliant Purchase Return Register with CGST, SGST, IGST Breakdowns"
          >
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div>
                <label className="block text-sm font-semibold mb-2 text-red-800 dark:text-red-400">
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
                <label className="block text-sm font-semibold mb-2 text-red-800 dark:text-red-400">
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
                <label className="block text-sm font-semibold mb-2 text-red-800 dark:text-red-400">
                  <Filter className="inline mr-1" size={14} />
                  View Mode
                </label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className={inputStyle}
                >
                  <option value="supplierwise">Supplier-wise</option>
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
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">Total Return Value</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-300">
                    ₹{gstSummary.totalInvoiceValue.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  📋 Purchase Return Register
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    ({records.length} return records)
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : records.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No purchase return records found for the selected period
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-white/10">
                      <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                        <th className="p-3">Return Date</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Original Invoice</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3 text-right">Return Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <td className="p-3">{new Date(record.returnDate).toLocaleDateString()}</td>
                          <td className="p-3">{record.supplierName}</td>
                          <td className="p-3 font-mono text-xs">{record.originalInvoiceNumber}</td>
                          <td className="p-3">{record.productDescription}</td>
                          <td className="p-3 text-xs">{record.returnReason || "-"}</td>
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