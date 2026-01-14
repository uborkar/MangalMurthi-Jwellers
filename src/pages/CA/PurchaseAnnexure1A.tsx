// src/pages/CA/PurchaseAnnexure1A.tsx - Purchase Register (Annexure 1A)
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Calendar, Download, Users, Package, Filter, Printer } from "lucide-react";
import {
  getPurchaseRecords,
  getSupplierWiseSummary,
  getProductWisePurchaseSummary,
  calculateGSTSummary,
} from "../../firebase/caReports";
import { PurchaseRecord, GSTSummary } from "../../types/caReports";
import ExcelJS from "exceljs";
import { createPrintHTML, printDocument } from "../../utils/printUtils";

type ViewMode = "supplierwise" | "productwise" | "detailed";

export default function PurchaseAnnexure1A() {
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
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [gstSummary, setGstSummary] = useState<GSTSummary | null>(null);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseRecords({ dateFrom, dateTo });
      setRecords(data);
      setGstSummary(calculateGSTSummary(data));

      if (data.length === 0) {
        toast("No purchase records found for selected period", { icon: "ℹ️" });
      } else {
        toast.success(`Loaded ${data.length} purchase records`);
      }
    } catch (error) {
      console.error("Error loading purchase data:", error);
      toast.error("Failed to load purchase records");
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
        { particulars: "Total Records", amount: gstSummary?.recordCount || 0 },
        { particulars: "", amount: "" },
        { particulars: "Taxable Value", amount: gstSummary?.totalTaxableValue.toFixed(2) || 0 },
        { particulars: "CGST", amount: gstSummary?.totalCGST.toFixed(2) || 0 },
        { particulars: "SGST", amount: gstSummary?.totalSGST.toFixed(2) || 0 },
        { particulars: "IGST", amount: gstSummary?.totalIGST.toFixed(2) || 0 },
        { particulars: "Total Invoice Value", amount: gstSummary?.totalInvoiceValue.toFixed(2) || 0 },
      ]);

      // Sheet 2: Detailed Records
      const detailSheet = workbook.addWorksheet("Purchase Register");
      detailSheet.columns = ([
        { header: "Date", key: "date", width: 12 },
        { header: "Supplier Name", key: "supplierName", width: 25 },
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
      ]);

      records.forEach((record) => {
        const formattedDate = new Date(record.date).toLocaleDateString();
        detailSheet.addRow({
          date: formattedDate,
          supplierName: record.supplierName,
          gstin: record.supplierGSTIN || "-",
          invoiceNo: record.invoiceNumber,
          product: record.productDescription,
          hsn: record.hsnCode || "-",
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
      link.download = `Purchase_Annexure_1A_${dateFrom}_to_${dateTo}.xlsx`;
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

  const handlePrint = () => {
    if (records.length === 0) {
      toast.error("No records to print");
      return;
    }

    const title = viewMode === "supplierwise" ? "Supplier-wise Purchase Summary" :
                  viewMode === "productwise" ? "Product-wise Purchase Summary" :
                  "Detailed Purchase Register";

    const printHTML = createPrintHTML({
      title: `Purchase Annexure 1A - ${title}`,
      styles: `
        .report-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .report-header h1 {
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 10px 0;
        }
        
        .report-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 11px;
          border: 1px solid #ddd;
          padding: 10px;
          background-color: #f9f9f9;
        }
        
        .summary-boxes {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .summary-box {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
          background-color: #f5f5f5;
        }
        
        .summary-box .label {
          font-size: 9px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .summary-box .value {
          font-size: 13px;
          font-weight: bold;
          color: #000;
        }
        
        .data-table {
          font-size: 10px;
        }
        
        .data-table th {
          background-color: #e0e0e0;
          padding: 6px 4px;
          font-weight: bold;
        }
        
        .data-table td {
          padding: 5px 4px;
        }
        
        @page {
          size: landscape;
          margin: 10mm;
        }
      `,
      bodyContent: `
        <div class="report-header">
          <h1>PURCHASE ANNEXURE 1A</h1>
          <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">${title}</p>
          <p style="margin: 5px 0; font-size: 11px;">Suwarnasparsh Gems & Jewellery Ltd.</p>
        </div>
        
        <div class="report-meta">
          <div><strong>Period:</strong> ${new Date(dateFrom).toLocaleDateString('en-GB')} to ${new Date(dateTo).toLocaleDateString('en-GB')}</div>
          <div><strong>Total Records:</strong> ${records.length}</div>
          <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</div>
        </div>
        
        ${gstSummary ? `
          <div class="summary-boxes">
            <div class="summary-box">
              <div class="label">Taxable Value</div>
              <div class="value">₹${gstSummary.totalTaxableValue.toFixed(2)}</div>
            </div>
            <div class="summary-box">
              <div class="label">CGST</div>
              <div class="value">₹${gstSummary.totalCGST.toFixed(2)}</div>
            </div>
            <div class="summary-box">
              <div class="label">SGST</div>
              <div class="value">₹${gstSummary.totalSGST.toFixed(2)}</div>
            </div>
            <div class="summary-box">
              <div class="label">IGST</div>
              <div class="value">₹${gstSummary.totalIGST.toFixed(2)}</div>
            </div>
            <div class="summary-box">
              <div class="label">Total</div>
              <div class="value">₹${gstSummary.totalInvoiceValue.toFixed(2)}</div>
            </div>
          </div>
        ` : ''}
        
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px;">#</th>
              <th style="width: 80px;">Date</th>
              <th>Supplier</th>
              <th style="width: 100px;">Invoice No</th>
              <th>Product</th>
              <th style="width: 90px;" class="text-right">Taxable Value</th>
              <th style="width: 70px;" class="text-right">CGST</th>
              <th style="width: 70px;" class="text-right">SGST</th>
              <th style="width: 85px;" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((record, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${new Date(record.date).toLocaleDateString('en-GB')}</td>
                <td>${record.supplierName}</td>
                <td style="font-family: monospace; font-size: 9px;">${record.invoiceNumber}</td>
                <td>${record.productDescription}</td>
                <td class="text-right">₹${record.taxableValue.toFixed(2)}</td>
                <td class="text-right">₹${record.cgstAmount.toFixed(2)}</td>
                <td class="text-right">₹${record.sgstAmount.toFixed(2)}</td>
                <td class="text-right font-bold">₹${record.totalValue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    });

    printDocument(printHTML);
  };

  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Purchase Annexure 1A"
        description="Supplier-wise & Product-wise Purchase Register"
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📋 Purchase Annexure 1A - Purchase Register"
            subtitle="GST-Compliant Purchase Register with CGST, SGST, IGST Breakdowns"
          >
            {/* Filters */}
            <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
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

              <div className="flex items-end gap-2">
                <button
                  onClick={exportToExcel}
                  disabled={loading || records.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  Export Excel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={loading || records.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Print Report"
                >
                  <Printer size={16} />
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
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Total Value</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    ₹{gstSummary.totalInvoiceValue.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="print-content rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {viewMode === "supplierwise" && "📊 Supplier-wise Purchase Summary"}
                  {viewMode === "productwise" && "📦 Product-wise Purchase Summary"}
                  {viewMode === "detailed" && "📋 Detailed Purchase Register"}
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
                    No purchase records found for the selected period
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-white/10">
                      <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                        <th className="p-3">Date</th>
                        <th className="p-3">Supplier</th>
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
                          <td className="p-3">{record.supplierName}</td>
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
