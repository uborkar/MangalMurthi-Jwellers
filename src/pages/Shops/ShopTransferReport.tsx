// src/pages/Shops/ShopTransferReport.tsx - Shop Transfer History & Reports
import { useState, useEffect, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  Calendar,
  Building2,
  Download,
  TrendingUp,
  Package,
  ArrowRightLeft,
  Eye,
} from "lucide-react";
import {
  getShopTransferLogs,
  getTransferStats,
  ShopTransferLog,
  TransferStats,
} from "../../firebase/transfers";
import ExcelJS from "exceljs";

// ═══════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

type ShopName = "Sangli" | "Satara1" | "Satara2" | "Karad1" | "Karad2" | "Kolhapur" | "Aurangabad";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const SHOPS: ShopName[] = [
  "Sangli",
  "Satara1",
  "Satara2",
  "Karad1",
  "Karad2",
  "Kolhapur",
  "Aurangabad",
];

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ShopTransferReport() {
  // State: Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [fromShop, setFromShop] = useState<ShopName | "All">("All");
  const [toShop, setToShop] = useState<ShopName | "All">("All");

  // State: Data
  const [transfers, setTransfers] = useState<ShopTransferLog[]>([]);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<ShopTransferLog | null>(null);

  // Load transfers when filters change
  useEffect(() => {
    loadTransfers();
  }, [dateFrom, dateTo, fromShop, toShop]);

  // Load transfers from Firestore
  const loadTransfers = async () => {
    setLoading(true);
    try {
      const filters: any = {
        dateFrom,
        dateTo,
      };

      if (fromShop !== "All") {
        filters.fromShop = fromShop;
      }
      if (toShop !== "All") {
        filters.toShop = toShop;
      }

      const [transfersData, statsData] = await Promise.all([
        getShopTransferLogs(filters),
        getTransferStats({ dateFrom, dateTo }),
      ]);

      setTransfers(transfersData);
      setStats(statsData);
      toast.success(`Loaded ${transfersData.length} transfer records`);
    } catch (error) {
      console.error("Error loading transfers:", error);
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  // Calculate filtered statistics
  const filteredStats = useMemo(() => {
    let totalItems = 0;
    let totalWeight = 0;

    transfers.forEach((transfer) => {
      totalItems += transfer.totals.totalQty;
      totalWeight += parseFloat(transfer.totals.totalWeight || "0");
    });

    return {
      totalTransfers: transfers.length,
      totalItems,
      totalWeight: totalWeight.toFixed(2),
    };
  }, [transfers]);

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
        { metric: "From Shop Filter", value: fromShop },
        { metric: "To Shop Filter", value: toShop },
        { metric: "Total Transfers", value: filteredStats.totalTransfers },
        { metric: "Total Items Transferred", value: filteredStats.totalItems },
        { metric: "Total Weight (gms)", value: filteredStats.totalWeight },
      ]);

      // Sheet 2: Transfer List
      const transferSheet = workbook.addWorksheet("Transfer List");
      transferSheet.columns = [
        { header: "Transfer No", key: "transferNo", width: 20 },
        { header: "Date", key: "date", width: 15 },
        { header: "From Shop", key: "fromShop", width: 15 },
        { header: "To Shop", key: "toShop", width: 15 },
        { header: "Items", key: "items", width: 10 },
        { header: "Weight (gms)", key: "weight", width: 15 },
        { header: "Transport By", key: "transportBy", width: 20 },
        { header: "Remarks", key: "remarks", width: 30 },
      ];

      transfers.forEach((transfer) => {
        transferSheet.addRow({
          transferNo: transfer.transferNo,
          date: new Date(transfer.date).toLocaleDateString(),
          fromShop: transfer.fromShop,
          toShop: transfer.toShop,
          items: transfer.totals.totalQty,
          weight: transfer.totals.totalWeight,
          transportBy: transfer.transportBy || "-",
          remarks: transfer.remarks || "-",
        });
      });

      // Sheet 3: Detailed Items
      const detailSheet = workbook.addWorksheet("Detailed Items");
      detailSheet.columns = [
        { header: "Transfer No", key: "transferNo", width: 20 },
        { header: "Date", key: "date", width: 15 },
        { header: "From Shop", key: "fromShop", width: 15 },
        { header: "To Shop", key: "toShop", width: 15 },
        { header: "Label", key: "label", width: 20 },
        { header: "Category", key: "category", width: 20 },
        { header: "Weight", key: "weight", width: 12 },
        { header: "Type", key: "type", width: 12 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Location", key: "location", width: 15 },
      ];

      transfers.forEach((transfer) => {
        transfer.rows.forEach((row) => {
          detailSheet.addRow({
            transferNo: transfer.transferNo,
            date: new Date(transfer.date).toLocaleDateString(),
            fromShop: transfer.fromShop,
            toShop: transfer.toShop,
            label: row.label,
            category: row.category || "-",
            weight: row.weight || "-",
            type: row.type || "-",
            quantity: row.quantity,
            location: row.location || "-",
          });
        });
      });

      // Sheet 4: From Shop Summary
      if (stats) {
        const fromShopSheet = workbook.addWorksheet("From Shop Summary");
        fromShopSheet.columns = [
          { header: "Shop", key: "shop", width: 20 },
          { header: "Transfers Out", key: "count", width: 15 },
        ];

        Object.entries(stats.byFromShop).forEach(([shop, count]) => {
          fromShopSheet.addRow({ shop, count });
        });

        // Sheet 5: To Shop Summary
        const toShopSheet = workbook.addWorksheet("To Shop Summary");
        toShopSheet.columns = [
          { header: "Shop", key: "shop", width: 20 },
          { header: "Transfers In", key: "count", width: 15 },
        ];

        Object.entries(stats.byToShop).forEach(([shop, count]) => {
          toShopSheet.addRow({ shop, count });
        });
      }

      // Style headers
      [summarySheet, transferSheet, detailSheet].forEach((sheet) => {
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
      link.download = `Shop_Transfer_Report_${dateFrom}_to_${dateTo}.xlsx`;
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

  // View transfer details
  const viewTransferDetails = (transfer: ShopTransferLog) => {
    setSelectedTransfer(transfer);
  };

  // Input styles
  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Shop Transfer Report"
        description="View and analyze shop-to-shop transfer history"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 Shop Transfer Report & Analysis"
            subtitle="Suwarnasparsh Jewellers - Transfer History"
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
                  From Shop
                </label>
                <select
                  value={fromShop}
                  onChange={(e) => setFromShop(e.target.value as ShopName | "All")}
                  className={inputStyle}
                >
                  <option value="All">All Shops</option>
                  {SHOPS.map((shop) => (
                    <option key={shop} value={shop}>
                      {shop}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  <Building2 className="inline mr-1" size={14} />
                  To Shop
                </label>
                <select
                  value={toShop}
                  onChange={(e) => setToShop(e.target.value as ShopName | "All")}
                  className={inputStyle}
                >
                  <option value="All">All Shops</option>
                  {SHOPS.map((shop) => (
                    <option key={shop} value={shop}>
                      {shop}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <ArrowRightLeft size={24} />
                  <span className="text-xs opacity-80">Total</span>
                </div>
                <div className="text-2xl font-bold">{filteredStats.totalTransfers}</div>
                <div className="text-xs opacity-80 mt-1">Total Transfers</div>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Package size={24} />
                  <span className="text-xs opacity-80">Items</span>
                </div>
                <div className="text-2xl font-bold">{filteredStats.totalItems}</div>
                <div className="text-xs opacity-80 mt-1">Items Transferred</div>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp size={24} />
                  <span className="text-xs opacity-80">Weight</span>
                </div>
                <div className="text-2xl font-bold">{filteredStats.totalWeight}</div>
                <div className="text-xs opacity-80 mt-1">Grams Transferred</div>
              </div>
            </div>

            {/* Transfer List */}
            <div className="mb-6">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    🚚 Transfer History ({transfers.length})
                  </h3>
                  <button
                    onClick={exportToExcel}
                    disabled={loading || transfers.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Download size={16} />
                    Export Excel
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-white/10">
                      <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                        <th className="p-3">Transfer No</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">From</th>
                        <th className="p-3">To</th>
                        <th className="p-3 text-right">Items</th>
                        <th className="p-3 text-right">Weight</th>
                        <th className="p-3">Transport</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500">
                            No transfers found for the selected filters
                          </td>
                        </tr>
                      ) : (
                        transfers.map((transfer) => (
                          <tr
                            key={transfer.id}
                            className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                          >
                            <td className="p-3 font-mono text-xs">{transfer.transferNo}</td>
                            <td className="p-3">
                              {new Date(transfer.date).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                                {transfer.fromShop}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                                {transfer.toShop}
                              </span>
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {transfer.totals.totalQty}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {transfer.totals.totalWeight}g
                            </td>
                            <td className="p-3 text-xs text-gray-600 dark:text-gray-400">
                              {transfer.transportBy || "-"}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => viewTransferDetails(transfer)}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Shop Summary */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Shop Summary */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      📤 Transfers Out (From Shop)
                    </h3>
                  </div>
                  <div className="p-4">
                    {Object.entries(stats.byFromShop).map(([shop, count]) => (
                      <div
                        key={shop}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <span className="font-medium">{shop}</span>
                        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-semibold">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* To Shop Summary */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      📥 Transfers In (To Shop)
                    </h3>
                  </div>
                  <div className="p-4">
                    {Object.entries(stats.byToShop).map(([shop, count]) => (
                      <div
                        key={shop}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <span className="font-medium">{shop}</span>
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TASection>
        </div>
      </div>

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4"
          onClick={() => setSelectedTransfer(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Transfer Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedTransfer.transferNo}
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                  <p className="font-semibold">
                    {new Date(selectedTransfer.date).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transport By</p>
                  <p className="font-semibold">{selectedTransfer.transportBy || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">From Shop</p>
                  <p className="font-semibold">{selectedTransfer.fromShop}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">To Shop</p>
                  <p className="font-semibold">{selectedTransfer.toShop}</p>
                </div>
              </div>

              {selectedTransfer.remarks && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remarks</p>
                  <p className="text-gray-900 dark:text-white">{selectedTransfer.remarks}</p>
                </div>
              )}

              <h3 className="font-semibold mb-3">Items Transferred</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/10">
                    <tr className="text-left">
                      <th className="p-2">Sr</th>
                      <th className="p-2">Label</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Weight</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransfer.rows.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-200 dark:border-gray-800"
                      >
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-mono text-xs">{row.label}</td>
                        <td className="p-2">{row.category || "-"}</td>
                        <td className="p-2">{row.weight || "-"}</td>
                        <td className="p-2">{row.type || "-"}</td>
                        <td className="p-2 text-right font-semibold">{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-white/5 font-semibold">
                    <tr>
                      <td colSpan={5} className="p-2 text-right">
                        Total:
                      </td>
                      <td className="p-2 text-right">{selectedTransfer.totals.totalQty}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="p-2 text-right">
                        Total Weight:
                      </td>
                      <td className="p-2 text-right">
                        {selectedTransfer.totals.totalWeight}g
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedTransfer.missingLabels && selectedTransfer.missingLabels.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    ⚠️ Missing Items (not found in source shop):
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {selectedTransfer.missingLabels.join(", ")}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedTransfer(null)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
