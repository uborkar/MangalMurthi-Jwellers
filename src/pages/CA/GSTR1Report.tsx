// src/pages/CA/GSTR1Report.tsx - GSTR-1 Compliant Report
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Calendar, Download, FileText, Store } from "lucide-react";
import { getSalesRecords, calculateGSTSummary } from "../../firebase/caReports";
import { SalesRecord, GSTSummary } from "../../types/caReports";
import ExcelJS from "exceljs";

type ReportSection = "b2b" | "b2cl" | "b2cs" | "hsn" | "docs";

interface B2BRecord {
  gstin: string;
  customerName: string;
  invoices: SalesRecord[];
  totalValue: number;
  totalTax: number;
}

interface B2CLRecord {
  state: string;
  invoices: SalesRecord[];
  totalValue: number;
}

interface B2CSRecord {
  type: string; // "Intra-State" or "Inter-State"
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

interface HSNSummary {
  hsnCode: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export default function GSTR1Report() {
  const [activeSection, setActiveSection] = useState<ReportSection>("b2b");
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
  const [allRecords, setAllRecords] = useState<SalesRecord[]>([]);
  const [b2bRecords, setB2bRecords] = useState<B2BRecord[]>([]);
  const [b2clRecords, setB2clRecords] = useState<B2CLRecord[]>([]);
  const [b2csRecords, setB2csRecords] = useState<B2CSRecord[]>([]);
  const [hsnSummary, setHsnSummary] = useState<HSNSummary[]>([]);
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
      setAllRecords(data);
      setGstSummary(calculateGSTSummary(data));
      
      // Process data for different sections
      processB2BRecords(data);
      processB2CLRecords(data);
      processB2CSRecords(data);
      processHSNSummary(data);
      
      toast.success(`Loaded ${data.length} sales records`);
    } catch (error) {
      console.error("Error loading sales data:", error);
      toast.error("Failed to load sales records");
    } finally {
      setLoading(false);
    }
  };

  // Process B2B Records (Registered customers with GSTIN)
  const processB2BRecords = (records: SalesRecord[]) => {
    const b2bMap = new Map<string, B2BRecord>();
    
    records.forEach((record) => {
      if (record.customerGSTIN && record.customerGSTIN.trim() !== "") {
        const gstin = record.customerGSTIN;
        if (!b2bMap.has(gstin)) {
          b2bMap.set(gstin, {
            gstin,
            customerName: record.customerName,
            invoices: [],
            totalValue: 0,
            totalTax: 0,
          });
        }
        
        const b2b = b2bMap.get(gstin)!;
        b2b.invoices.push(record);
        b2b.totalValue += record.totalValue;
        b2b.totalTax += record.cgstAmount + record.sgstAmount + record.igstAmount;
      }
    });
    
    setB2bRecords(Array.from(b2bMap.values()).sort((a, b) => b.totalValue - a.totalValue));
  };

  // Process B2CL Records (Large invoices >2.5L to unregistered customers, inter-state)
  const processB2CLRecords = (records: SalesRecord[]) => {
    const b2clMap = new Map<string, B2CLRecord>();
    
    records.forEach((record) => {
      // B2CL: No GSTIN, invoice value > 2.5L, and inter-state (IGST > 0)
      if ((!record.customerGSTIN || record.customerGSTIN.trim() === "") && 
          record.totalValue > 250000 && 
          record.igstAmount > 0) {
        const state = "Other State"; // You'd extract this from customer address
        if (!b2clMap.has(state)) {
          b2clMap.set(state, {
            state,
            invoices: [],
            totalValue: 0,
          });
        }
        
        const b2cl = b2clMap.get(state)!;
        b2cl.invoices.push(record);
        b2cl.totalValue += record.totalValue;
      }
    });
    
    setB2clRecords(Array.from(b2clMap.values()));
  };

  // Process B2CS Records (Small invoices, consolidated by rate)
  const processB2CSRecords = (records: SalesRecord[]) => {
    const b2csMap = new Map<string, B2CSRecord>();
    
    records.forEach((record) => {
      // B2CS: No GSTIN and (invoice ≤ 2.5L or intra-state)
      if ((!record.customerGSTIN || record.customerGSTIN.trim() === "") && 
          (record.totalValue <= 250000 || record.igstAmount === 0)) {
        const type = record.igstAmount > 0 ? "Inter-State" : "Intra-State";
        const rate = record.cgstRate + record.sgstRate + record.igstRate;
        const key = `${type}-${rate}`;
        
        if (!b2csMap.has(key)) {
          b2csMap.set(key, {
            type,
            rate,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
          });
        }
        
        const b2cs = b2csMap.get(key)!;
        b2cs.taxableValue += record.taxableValue;
        b2cs.cgst += record.cgstAmount;
        b2cs.sgst += record.sgstAmount;
        b2cs.igst += record.igstAmount;
      }
    });
    
    setB2csRecords(Array.from(b2csMap.values()));
  };

  // Process HSN Summary
  const processHSNSummary = (records: SalesRecord[]) => {
    const hsnMap = new Map<string, HSNSummary>();
    
    records.forEach((record) => {
      // For jewellery, HSN code is typically 7113 (gold jewellery) or 7114 (silver)
      const hsnCode = record.category === "Silver" ? "7114" : "7113";
      const description = `${record.category || "Gold"} Jewellery`;
      
      if (!hsnMap.has(hsnCode)) {
        hsnMap.set(hsnCode, {
          hsnCode,
          description,
          uqc: "GMS", // Grams
          totalQuantity: 0,
          totalValue: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
        });
      }
      
      const hsn = hsnMap.get(hsnCode)!;
      hsn.totalQuantity += record.weight;
      hsn.totalValue += record.totalValue;
      hsn.taxableValue += record.taxableValue;
      hsn.cgst += record.cgstAmount;
      hsn.sgst += record.sgstAmount;
      hsn.igst += record.igstAmount;
    });
    
    setHsnSummary(Array.from(hsnMap.values()));
  };

  const exportToExcel = async () => {
    const loadingToast = toast.loading("Generating GSTR-1 Excel report...");

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Suwarnasparsh Jewellers";
      workbook.created = new Date();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet("GSTR-1 Summary");
      summarySheet.columns = [
        { header: "Section", key: "section", width: 30 },
        { header: "Count", key: "count", width: 15 },
        { header: "Taxable Value", key: "taxable", width: 20 },
        { header: "Total Tax", key: "tax", width: 20 },
      ];

      summarySheet.addRows([
        { section: "B2B - Business to Business", count: b2bRecords.length, 
          taxable: b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.taxableValue, 0), 0).toFixed(2),
          tax: b2bRecords.reduce((sum, r) => sum + r.totalTax, 0).toFixed(2) },
        { section: "B2CL - B2C Large (>2.5L)", count: b2clRecords.reduce((sum, r) => sum + r.invoices.length, 0),
          taxable: b2clRecords.reduce((sum, r) => sum + r.totalValue, 0).toFixed(2),
          tax: "" },
        { section: "B2CS - B2C Small", count: b2csRecords.length,
          taxable: b2csRecords.reduce((sum, r) => sum + r.taxableValue, 0).toFixed(2),
          tax: b2csRecords.reduce((sum, r) => sum + r.cgst + r.sgst + r.igst, 0).toFixed(2) },
        { section: "HSN Summary", count: hsnSummary.length,
          taxable: hsnSummary.reduce((sum, h) => sum + h.taxableValue, 0).toFixed(2),
          tax: hsnSummary.reduce((sum, h) => sum + h.cgst + h.sgst + h.igst, 0).toFixed(2) },
      ]);

      // Sheet 2: B2B Details
      const b2bSheet = workbook.addWorksheet("B2B");
      b2bSheet.columns = [
        { header: "GSTIN", key: "gstin", width: 18 },
        { header: "Customer Name", key: "name", width: 25 },
        { header: "Invoice No", key: "invoice", width: 15 },
        { header: "Invoice Date", key: "date", width: 12 },
        { header: "Invoice Value", key: "value", width: 15 },
        { header: "Taxable Value", key: "taxable", width: 15 },
        { header: "CGST", key: "cgst", width: 12 },
        { header: "SGST", key: "sgst", width: 12 },
        { header: "IGST", key: "igst", width: 12 },
      ];

      b2bRecords.forEach((b2b) => {
        b2b.invoices.forEach((inv) => {
          b2bSheet.addRow({
            gstin: b2b.gstin,
            name: b2b.customerName,
            invoice: inv.invoiceNumber,
            date: new Date(inv.date).toLocaleDateString(),
            value: inv.totalValue.toFixed(2),
            taxable: inv.taxableValue.toFixed(2),
            cgst: inv.cgstAmount.toFixed(2),
            sgst: inv.sgstAmount.toFixed(2),
            igst: inv.igstAmount.toFixed(2),
          });
        });
      });

      // Sheet 3: B2CL Details
      const b2clSheet = workbook.addWorksheet("B2CL");
      b2clSheet.columns = [
        { header: "State", key: "state", width: 20 },
        { header: "Invoice No", key: "invoice", width: 15 },
        { header: "Invoice Date", key: "date", width: 12 },
        { header: "Invoice Value", key: "value", width: 15 },
        { header: "Taxable Value", key: "taxable", width: 15 },
        { header: "IGST", key: "igst", width: 12 },
      ];

      b2clRecords.forEach((b2cl) => {
        b2cl.invoices.forEach((inv) => {
          b2clSheet.addRow({
            state: b2cl.state,
            invoice: inv.invoiceNumber,
            date: new Date(inv.date).toLocaleDateString(),
            value: inv.totalValue.toFixed(2),
            taxable: inv.taxableValue.toFixed(2),
            igst: inv.igstAmount.toFixed(2),
          });
        });
      });

      // Sheet 4: B2CS Summary
      const b2csSheet = workbook.addWorksheet("B2CS");
      b2csSheet.columns = [
        { header: "Type", key: "type", width: 15 },
        { header: "Rate (%)", key: "rate", width: 10 },
        { header: "Taxable Value", key: "taxable", width: 15 },
        { header: "CGST", key: "cgst", width: 12 },
        { header: "SGST", key: "sgst", width: 12 },
        { header: "IGST", key: "igst", width: 12 },
      ];

      b2csRecords.forEach((b2cs) => {
        b2csSheet.addRow({
          type: b2cs.type,
          rate: b2cs.rate,
          taxable: b2cs.taxableValue.toFixed(2),
          cgst: b2cs.cgst.toFixed(2),
          sgst: b2cs.sgst.toFixed(2),
          igst: b2cs.igst.toFixed(2),
        });
      });

      // Sheet 5: HSN Summary
      const hsnSheet = workbook.addWorksheet("HSN Summary");
      hsnSheet.columns = [
        { header: "HSN Code", key: "hsn", width: 12 },
        { header: "Description", key: "desc", width: 30 },
        { header: "UQC", key: "uqc", width: 10 },
        { header: "Total Quantity", key: "qty", width: 15 },
        { header: "Total Value", key: "value", width: 15 },
        { header: "Taxable Value", key: "taxable", width: 15 },
        { header: "CGST", key: "cgst", width: 12 },
        { header: "SGST", key: "sgst", width: 12 },
        { header: "IGST", key: "igst", width: 12 },
      ];

      hsnSummary.forEach((hsn) => {
        hsnSheet.addRow({
          hsn: hsn.hsnCode,
          desc: hsn.description,
          uqc: hsn.uqc,
          qty: hsn.totalQuantity.toFixed(3),
          value: hsn.totalValue.toFixed(2),
          taxable: hsn.taxableValue.toFixed(2),
          cgst: hsn.cgst.toFixed(2),
          sgst: hsn.sgst.toFixed(2),
          igst: hsn.igst.toFixed(2),
        });
      });

      // Style all sheets
      [summarySheet, b2bSheet, b2clSheet, b2csSheet, hsnSheet].forEach((sheet) => {
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
      link.download = `GSTR1_Report_${dateFrom}_to_${dateTo}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("GSTR-1 Excel report downloaded!");
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
        title="GSTR-1 Report"
        description="GST Return 1 - Outward Supplies Report"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 GSTR-1 Report - Outward Supplies"
            subtitle="Complete GST Return 1 with B2B, B2CL, B2CS, and HSN Summary"
          >
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
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

              <div className="flex items-end">
                <button
                  onClick={exportToExcel}
                  disabled={loading || allRecords.length === 0}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} />
                  Export GSTR-1
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {gstSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {allRecords.length}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">B2B Invoices</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {b2bRecords.reduce((sum, r) => sum + r.invoices.length, 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">B2C Invoices</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {allRecords.length - b2bRecords.reduce((sum, r) => sum + r.invoices.length, 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    ₹{gstSummary.totalInvoiceValue.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {[
                { key: "b2b", label: "B2B", icon: "🏢" },
                { key: "b2cl", label: "B2CL", icon: "🛍️" },
                { key: "b2cs", label: "B2CS", icon: "📦" },
                { key: "hsn", label: "HSN Summary", icon: "📋" },
                { key: "docs", label: "Documents", icon: "📄" },
              ].map((section) => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key as ReportSection)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeSection === section.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  {section.icon} {section.label}
                </button>
              ))}
            </div>

            {/* Content based on active section */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : (
                <>
                  {/* B2B Section */}
                  {activeSection === "b2b" && (
                    <div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          🏢 B2B - Business to Business
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            ({b2bRecords.length} customers, {b2bRecords.reduce((sum, r) => sum + r.invoices.length, 0)} invoices)
                          </span>
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        {b2bRecords.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No B2B transactions found
                          </div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-white/10">
                              <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                                <th className="p-3">GSTIN</th>
                                <th className="p-3">Customer Name</th>
                                <th className="p-3 text-right">Invoices</th>
                                <th className="p-3 text-right">Total Value</th>
                                <th className="p-3 text-right">Total Tax</th>
                              </tr>
                            </thead>
                            <tbody>
                              {b2bRecords.map((record, index) => (
                                <tr
                                  key={index}
                                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  <td className="p-3 font-mono text-xs">{record.gstin}</td>
                                  <td className="p-3">{record.customerName}</td>
                                  <td className="p-3 text-right">{record.invoices.length}</td>
                                  <td className="p-3 text-right font-mono">₹{record.totalValue.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono">₹{record.totalTax.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* B2CL Section */}
                  {activeSection === "b2cl" && (
                    <div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          🛍️ B2CL - B2C Large (Invoice Value &gt; ₹2.5 Lakh)
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            ({b2clRecords.reduce((sum, r) => sum + r.invoices.length, 0)} invoices)
                          </span>
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        {b2clRecords.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No B2CL transactions found
                          </div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-white/10">
                              <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                                <th className="p-3">State</th>
                                <th className="p-3 text-right">Invoices</th>
                                <th className="p-3 text-right">Total Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {b2clRecords.map((record, index) => (
                                <tr
                                  key={index}
                                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  <td className="p-3">{record.state}</td>
                                  <td className="p-3 text-right">{record.invoices.length}</td>
                                  <td className="p-3 text-right font-mono">₹{record.totalValue.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* B2CS Section */}
                  {activeSection === "b2cs" && (
                    <div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          📦 B2CS - B2C Small (Consolidated)
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            ({b2csRecords.length} entries)
                          </span>
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        {b2csRecords.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No B2CS transactions found
                          </div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-white/10">
                              <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                                <th className="p-3">Type</th>
                                <th className="p-3 text-right">Rate (%)</th>
                                <th className="p-3 text-right">Taxable Value</th>
                                <th className="p-3 text-right">CGST</th>
                                <th className="p-3 text-right">SGST</th>
                                <th className="p-3 text-right">IGST</th>
                              </tr>
                            </thead>
                            <tbody>
                              {b2csRecords.map((record, index) => (
                                <tr
                                  key={index}
                                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      record.type === "Intra-State" 
                                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                    }`}>
                                      {record.type}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">{record.rate}%</td>
                                  <td className="p-3 text-right font-mono">₹{record.taxableValue.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono">₹{record.cgst.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono">₹{record.sgst.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono">₹{record.igst.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* HSN Summary Section */}
                  {activeSection === "hsn" && (
                    <div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          📋 HSN Summary
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            ({hsnSummary.length} HSN codes)
                          </span>
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        {hsnSummary.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No HSN data available
                          </div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-white/10">
                              <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                                <th className="p-3">HSN Code</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">UQC</th>
                                <th className="p-3 text-right">Quantity</th>
                                <th className="p-3 text-right">Taxable Value</th>
                                <th className="p-3 text-right">CGST</th>
                                <th className="p-3 text-right">SGST</th>
                                <th className="p-3 text-right">IGST</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hsnSummary.map((hsn, index) => (
                                <tr
                                  key={index}
                                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                  <td className="p-3 font-mono font-semibold">{hsn.hsnCode}</td>
                                  <td className="p-3">{hsn.description}</td>
                                  <td className="p-3">{hsn.uqc}</td>
                                  <td className="p-3 text-right font-mono">{hsn.totalQuantity.toFixed(3)}</td>
                                  <td className="p-3 text-right font-mono">₹{hsn.taxableValue.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono">₹{hsn.cgst.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono">₹{hsn.sgst.toFixed(2)}</td>
                                  <td className="p-3 text-right font-mono">₹{hsn.igst.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  {activeSection === "docs" && (
                    <div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          📄 Document Summary
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Invoices Issued</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{allRecords.length}</p>
                          </div>
                          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Invoice Series</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                              {allRecords.length > 0 ? "INV-" : "-"}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Cancelled Invoices</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                          </div>
                        </div>
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-400">
                            <FileText className="inline mr-2" size={16} />
                            Document details are automatically tracked from your sales records. 
                            Ensure all invoices are properly numbered and recorded in the system.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
}
