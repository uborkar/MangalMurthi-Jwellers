// src/pages/CA/BranchWiseBillReport.tsx - Branch-wise sales summary report
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Calendar, Download, Store, TrendingUp } from "lucide-react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import ExcelJS from "exceljs";

interface BranchData {
    branchName: string;
    invoiceCount: number;
    totalTaxableValue: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalInvoiceValue: number;
}

export default function BranchWiseBillReport() {
    const [loading, setLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split("T")[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
    const [branchData, setBranchData] = useState<BranchData[]>([]);
    const [totals, setTotals] = useState({
        invoices: 0,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalValue: 0,
    });

    const branches = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

    useEffect(() => {
        loadBranchData();
    }, [dateFrom, dateTo]);

    const loadBranchData = async () => {
        setLoading(true);
        try {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);

            const branchResults: BranchData[] = [];

            for (const branch of branches) {
                // Query invoices for this branch
                const invoicesRef = collection(db, "shops", branch, "invoices");
                const q = query(
                    invoicesRef,
                    where("createdAt", ">=", fromDate.toISOString()),
                    where("createdAt", "<=", toDate.toISOString())
                );

                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    continue; // Skip branches with no data
                }

                let invoiceCount = 0;
                let totalTaxableValue = 0;
                let totalCGST = 0;
                let totalSGST = 0;
                let totalIGST = 0;
                let totalInvoiceValue = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    invoiceCount++;

                    // ✅ FIXED: Access the correct invoice structure from Billing.tsx
                    // Invoice data has a 'totals' object with all GST calculations
                    const totalsObj = data.totals || {};
                    const taxable = totalsObj.taxable || totalsObj.netAmount || 0;
                    const cgst = totalsObj.cgst || 0;
                    const sgst = totalsObj.sgst || 0;
                    const igst = totalsObj.igst || 0;
                    const total = totalsObj.grandTotal || totalsObj.total || data.grandTotal || 0;

                    totalTaxableValue += taxable;
                    totalCGST += cgst;
                    totalSGST += sgst;
                    totalIGST += igst;
                    totalInvoiceValue += total;
                });

                branchResults.push({
                    branchName: branch,
                    invoiceCount,
                    totalTaxableValue,
                    totalCGST,
                    totalSGST,
                    totalIGST,
                    totalInvoiceValue,
                });
            }

            // Sort by total value descending
            branchResults.sort((a, b) => b.totalInvoiceValue - a.totalInvoiceValue);
            setBranchData(branchResults);

            // Calculate totals
            const calculatedTotals = branchResults.reduce(
                (acc, branch) => ({
                    invoices: acc.invoices + branch.invoiceCount,
                    taxableValue: acc.taxableValue + branch.totalTaxableValue,
                    cgst: acc.cgst + branch.totalCGST,
                    sgst: acc.sgst + branch.totalSGST,
                    igst: acc.igst + branch.totalIGST,
                    totalValue: acc.totalValue + branch.totalInvoiceValue,
                }),
                { invoices: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalValue: 0 }
            );
            setTotals(calculatedTotals);

            toast.success(`Loaded data for ${branchResults.length} branches`);
        } catch (error) {
            console.error("Error loading branch data:", error);
            toast.error("Failed to load branch data");
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = async () => {
        const loadingToast = toast.loading("Generating Excel report...");

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Mangalmurthi Jewellers";
            workbook.created = new Date();

            const sheet = workbook.addWorksheet("Branch-Wise Sales");

            // Add title
            sheet.mergeCells("A1:H1");
            const titleRow = sheet.getCell("A1");
            titleRow.value = "Branch-Wise Bill Report";
            titleRow.font = { size: 16, bold: true };
            titleRow.alignment = { horizontal: "center", vertical: "middle" };

            // Add date range
            sheet.mergeCells("A2:H2");
            const dateRow = sheet.getCell("A2");
            dateRow.value = `Period: ${dateFrom} to ${dateTo}`;
            dateRow.font = { size: 12 };
            dateRow.alignment = { horizontal: "center" };

            // Add empty row
            sheet.addRow([]);

            // Headers
            sheet.columns = [
                { header: "Branch Name", key: "branch", width: 20 },
                { header: "No. of Bills", key: "count", width: 15 },
                { header: "Taxable Value", key: "taxable", width: 18 },
                { header: "CGST", key: "cgst", width: 15 },
                { header: "SGST", key: "sgst", width: 15 },
                { header: "IGST", key: "igst", width: 15 },
                { header: "Total Tax", key: "tax", width: 18 },
                { header: "Total Value", key: "total", width: 18 },
            ];

            // Style header row
            const headerRow = sheet.getRow(4);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF4472C4" },
            };
            headerRow.alignment = { horizontal: "center", vertical: "middle" };

            // Add data rows
            branchData.forEach((branch) => {
                const totalTax = branch.totalCGST + branch.totalSGST + branch.totalIGST;
                sheet.addRow({
                    branch: branch.branchName,
                    count: branch.invoiceCount,
                    taxable: branch.totalTaxableValue.toFixed(2),
                    cgst: branch.totalCGST.toFixed(2),
                    sgst: branch.totalSGST.toFixed(2),
                    igst: branch.totalIGST.toFixed(2),
                    tax: totalTax.toFixed(2),
                    total: branch.totalInvoiceValue.toFixed(2),
                });
            });

            // Add totals row
            const totalTax = totals.cgst + totals.sgst + totals.igst;
            const totalsRow = sheet.addRow({
                branch: "TOTAL",
                count: totals.invoices,
                taxable: totals.taxableValue.toFixed(2),
                cgst: totals.cgst.toFixed(2),
                sgst: totals.sgst.toFixed(2),
                igst: totals.igst.toFixed(2),
                tax: totalTax.toFixed(2),
                total: totals.totalValue.toFixed(2),
            });

            totalsRow.font = { bold: true };
            totalsRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFE0E0E0" },
            };

            // Format currency columns
            ["C", "D", "E", "F", "G", "H"].forEach((col) => {
                sheet.getColumn(col).numFmt = "₹#,##0.00";
                sheet.getColumn(col).alignment = { horizontal: "right" };
            });

            // Center align count column
            sheet.getColumn("B").alignment = { horizontal: "center" };

            // Generate file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Branch_Wise_Bills_${dateFrom}_to_${dateTo}.xlsx`;
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
                title="Branch-Wise Bill Report"
                description="Branch-wise sales summary with GST breakdown"
            />

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    <TASection
                        title="🏢 Branch-Wise Bill Report"
                        subtitle="Comprehensive sales summary for all branches with GST details"
                    >
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
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

                            <div className="md:col-span-2 flex items-end gap-3">
                                <button
                                    onClick={loadBranchData}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <TrendingUp size={16} />
                                    Load Data
                                </button>
                                <button
                                    onClick={exportToExcel}
                                    disabled={loading || branchData.length === 0}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    Export Excel
                                </button>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1 font-medium">Total Branches</p>
                                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{branchData.length}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                                <p className="text-sm text-green-600 dark:text-green-400 mb-1 font-medium">Total Bills</p>
                                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{totals.invoices}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1 font-medium">Taxable Value</p>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">₹{totals.taxableValue.toFixed(2)}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                                <p className="text-sm text-orange-600 dark:text-orange-400 mb-1 font-medium">Total Tax</p>
                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                    ₹{(totals.cgst + totals.sgst + totals.igst).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                                <p className="text-sm text-red-600 dark:text-red-400 mb-1 font-medium">Grand Total</p>
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">₹{totals.totalValue.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                            <div className="p-4 bg-green-600 text-white">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Store size={20} />
                                    Branch-Wise Sales Summary
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-500">Loading branch data...</div>
                                ) : branchData.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        No data available for the selected period
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 dark:bg-white/10">
                                            <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                                                <th className="p-3">Branch Name</th>
                                                <th className="p-3 text-center">No. of Bills</th>
                                                <th className="p-3 text-right">Taxable Value</th>
                                                <th className="p-3 text-right">CGST</th>
                                                <th className="p-3 text-right">SGST</th>
                                                <th className="p-3 text-right">IGST</th>
                                                <th className="p-3 text-right">Total Tax</th>
                                                <th className="p-3 text-right">Total Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {branchData.map((branch, index) => {
                                                const totalTax = branch.totalCGST + branch.totalSGST + branch.totalIGST;
                                                return (
                                                    <tr
                                                        key={index}
                                                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                                                    >
                                                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                                                            {branch.branchName}
                                                        </td>
                                                        <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                                                            {branch.invoiceCount}
                                                        </td>
                                                        <td className="p-3 text-right font-mono">₹{branch.totalTaxableValue.toFixed(2)}</td>
                                                        <td className="p-3 text-right font-mono">₹{branch.totalCGST.toFixed(2)}</td>
                                                        <td className="p-3 text-right font-mono">₹{branch.totalSGST.toFixed(2)}</td>
                                                        <td className="p-3 text-right font-mono">₹{branch.totalIGST.toFixed(2)}</td>
                                                        <td className="p-3 text-right font-mono text-orange-600 dark:text-orange-400">
                                                            ₹{totalTax.toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-green-600 dark:text-green-400">
                                                            ₹{branch.totalInvoiceValue.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Totals Row */}
                                            <tr className="bg-gray-100 dark:bg-white/10 font-bold border-t-2 border-gray-300 dark:border-gray-700">
                                                <td className="p-3 text-gray-900 dark:text-white">TOTAL</td>
                                                <td className="p-3 text-center text-blue-700 dark:text-blue-300">{totals.invoices}</td>
                                                <td className="p-3 text-right font-mono">₹{totals.taxableValue.toFixed(2)}</td>
                                                <td className="p-3 text-right font-mono">₹{totals.cgst.toFixed(2)}</td>
                                                <td className="p-3 text-right font-mono">₹{totals.sgst.toFixed(2)}</td>
                                                <td className="p-3 text-right font-mono">₹{totals.igst.toFixed(2)}</td>
                                                <td className="p-3 text-right font-mono text-orange-700 dark:text-orange-300">
                                                    ₹{(totals.cgst + totals.sgst + totals.igst).toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-mono text-green-700 dark:text-green-300">
                                                    ₹{totals.totalValue.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Info Note */}
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                <strong>📌 Note:</strong> This report shows branch-wise sales summary for the selected date range.
                                All amounts include GST breakdown (CGST, SGST, IGST). Export to Excel for detailed analysis and CA submission.
                            </p>
                        </div>
                    </TASection>
                </div>
            </div>
        </>
    );
}
