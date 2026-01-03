// src/pages/Shops/ReturnReport.tsx - Return Reports & History
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  Calendar,
  Building2,
  Download,
  Package,
  ArrowLeft,
  Truck,
  Eye,
  TrendingDown,
} from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import ExcelJS from "exceljs";

type BranchName = "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";
type ReturnType = "customer" | "warehouse" | "all";

const BRANCHES: BranchName[] = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

export default function ReturnReport() {
  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedBranch, setSelectedBranch] = useState<BranchName | "All">("All");
  const [returnType, setReturnType] = useState<ReturnType>("all");

  // Data
  const [customerReturns, setCustomerReturns] = useState<any[]>([]);
  const [warehouseReturns, setWarehouseReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  useEffect(() => {
    loadReturns();
  }, [dateFrom, dateTo, selectedBranch, returnType]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);

      let customerData: any[] = [];
      let warehouseData: any[] = [];

      // Load Customer Returns
      if (returnType === "customer" || returnType === "all") {
        if (selectedBranch === "All") {
          for (const branch of BRANCHES) {
            const returns = await loadCustomerReturnsForBranch(branch, fromDate, toDate);
            customerData.push(...returns);
          }
        } else {
          customerData = await loadCustomerReturnsForBranch(selectedBranch, fromDate, toDate);
        }
      }

      // Load Warehouse Returns
      if (returnType === "warehouse" || returnType === "all") {
        const returnsRef = collection(db, "warehouseReturns");
        let q = query(
          returnsRef,
          where("returnDate", ">=", fromDate.toISOString()),
          where("returnDate", "<=", toDate.toISOString()),
          orderBy("returnDate", "desc")
        );

        if (selectedBranch !== "All") {
          q = query(
            returnsRef,
            where("branch", "==", selectedBranch),
            where("returnDate", ">=", fromDate.toISOString()),
            where("returnDate", "<=", toDate.toISOString()),
            orderBy("returnDate", "desc")
          );
        }

        const snap = await getDocs(q);
        warehouseData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      setCustomerReturns(customerData);
      setWarehouseReturns(warehouseData);
      toast.success(`Loaded ${customerData.length} customer + ${warehouseData.length} warehouse returns`);
    } catch (error) {
      console.error("Error loading returns:", error);
      toast.error("Failed to load returns");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerReturnsForBranch = async (branch: BranchName, fromDate: Date, toDate: Date) => {
    const returnsRef = collection(db, "shops", branch, "customerReturns");
    const q = query(
      returnsRef,
      where("returnDate", ">=", fromDate.toISOString()),
      where("returnDate", "<=", toDate.toISOString()),
      orderBy("returnDate", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, branch, ...doc.data() }));
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Customer Returns Sheet
    if (customerReturns.length > 0) {
      const sheet1 = workbook.addWorksheet("Customer Returns");
      sheet1.columns = [
        { header: "Return ID", key: "returnId", width: 20 },
        { header: "Branch", key: "branch", width: 15 },
        { header: "Invoice ID", key: "invoiceId", width: 20 },
        { header: "Date", key: "returnDate", width: 15 },
        { header: "Barcode", key: "barcode", width: 15 },
        { header: "Category", key: "category", width: 15 },
        { header: "Subcategory", key: "subcategory", width: 15 },
        { header: "Weight", key: "weight", width: 10 },
        { header: "Price", key: "sellingPrice", width: 12 },
        { header: "Reason", key: "returnReason", width: 20 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Status", key: "status", width: 15 },
      ];

      customerReturns.forEach(ret => {
        sheet1.addRow({
          ...ret,
          returnDate: new Date(ret.returnDate).toLocaleDateString(),
        });
      });

      sheet1.getRow(1).font = { bold: true };
      sheet1.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
    }

    // Warehouse Returns Sheet
    if (warehouseReturns.length > 0) {
      const sheet2 = workbook.addWorksheet("Warehouse Returns");
      sheet2.columns = [
        { header: "Return ID", key: "returnId", width: 20 },
        { header: "Branch", key: "branch", width: 15 },
        { header: "Date", key: "returnDate", width: 15 },
        { header: "Barcode", key: "barcode", width: 15 },
        { header: "Category", key: "category", width: 15 },
        { header: "Subcategory", key: "subcategory", width: 15 },
        { header: "Weight", key: "weight", width: 10 },
        { header: "Cost Price", key: "costPrice", width: 12 },
        { header: "Reason", key: "returnReason", width: 20 },
        { header: "Remarks", key: "remarks", width: 30 },
        { header: "Status", key: "status", width: 15 },
      ];

      warehouseReturns.forEach(ret => {
        sheet2.addRow({
          ...ret,
          returnDate: new Date(ret.returnDate).toLocaleDateString(),
        });
      });

      sheet2.getRow(1).font = { bold: true };
      sheet2.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF9B59B6" },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Return_Report_${dateFrom}_to_${dateTo}.xlsx`;
    a.click();
    toast.success("Report exported successfully!");
  };

  const inputStyle = "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm";

  const totalCustomerReturns = customerReturns.length;
  const totalWarehouseReturns = warehouseReturns.length;
  const totalCustomerValue = customerReturns.reduce((sum, r) => sum + (r.sellingPrice || 0), 0);
  const totalWarehouseValue = warehouseReturns.reduce((sum, r) => sum + (r.costPrice || 0), 0);

  return (
    <>
      <PageMeta title="Return Reports" description="View customer and warehouse return reports" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 Return Reports"
            subtitle="View and analyze customer returns and warehouse returns"
          >
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
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
                <label className="block text-sm font-medium mb-2">
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
                <label className="block text-sm font-medium mb-2">
                  <Building2 className="inline mr-1" size={14} />
                  Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as any)}
                  className={inputStyle}
                >
                  <option value="All">All Branches</option>
                  {BRANCHES.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Package className="inline mr-1" size={14} />
                  Return Type
                </label>
                <select
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value as ReturnType)}
                  className={inputStyle}
                >
                  <option value="all">All Returns</option>
                  <option value="customer">Customer Returns</option>
                  <option value="warehouse">Warehouse Returns</option>
                </select>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowLeft className="text-blue-600 dark:text-blue-400" size={20} />
                  <span className="text-sm text-blue-700 dark:text-blue-300">Customer Returns</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-400">{totalCustomerReturns}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  ₹{totalCustomerValue.toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="text-purple-600 dark:text-purple-400" size={20} />
                  <span className="text-sm text-purple-700 dark:text-purple-300">Warehouse Returns</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-400">{totalWarehouseReturns}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  ₹{totalWarehouseValue.toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="text-gray-600 dark:text-gray-400" size={20} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Total Returns</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalCustomerReturns + totalWarehouseReturns}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  ₹{(totalCustomerValue + totalWarehouseValue).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={exportToExcel}
                  disabled={loading || (customerReturns.length === 0 && warehouseReturns.length === 0)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Download size={18} />
                  Export Excel
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading returns...</p>
              </div>
            ) : (
              <>
                {/* Customer Returns Table */}
                {(returnType === "customer" || returnType === "all") && customerReturns.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <ArrowLeft className="text-blue-600" size={20} />
                      Customer Returns ({customerReturns.length})
                    </h3>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-blue-50 dark:bg-blue-900/20">
                            <tr className="text-left">
                              <th className="p-3">Date</th>
                              <th className="p-3">Return ID</th>
                              <th className="p-3">Branch</th>
                              <th className="p-3">Invoice ID</th>
                              <th className="p-3">Barcode</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Weight</th>
                              <th className="p-3">Price</th>
                              <th className="p-3">Reason</th>
                              <th className="p-3">Status</th>
                              <th className="p-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerReturns.map((ret, idx) => (
                              <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="p-3">{new Date(ret.returnDate).toLocaleDateString()}</td>
                                <td className="p-3 font-mono text-xs">{ret.returnId}</td>
                                <td className="p-3">{ret.branch}</td>
                                <td className="p-3 font-mono text-xs">{ret.invoiceId}</td>
                                <td className="p-3 font-mono text-xs">{ret.barcode}</td>
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{ret.category}</p>
                                    <p className="text-xs text-gray-500">{ret.subcategory}</p>
                                  </div>
                                </td>
                                <td className="p-3">{ret.weight}g</td>
                                <td className="p-3 font-semibold text-green-600">₹{ret.sellingPrice?.toLocaleString()}</td>
                                <td className="p-3">{ret.returnReason}</td>
                                <td className="p-3">
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                    {ret.status}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={() => setSelectedReturn(ret)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warehouse Returns Table */}
                {(returnType === "warehouse" || returnType === "all") && warehouseReturns.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Truck className="text-purple-600" size={20} />
                      Warehouse Returns ({warehouseReturns.length})
                    </h3>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-purple-50 dark:bg-purple-900/20">
                            <tr className="text-left">
                              <th className="p-3">Date</th>
                              <th className="p-3">Return ID</th>
                              <th className="p-3">Branch</th>
                              <th className="p-3">Barcode</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Weight</th>
                              <th className="p-3">Cost Price</th>
                              <th className="p-3">Reason</th>
                              <th className="p-3">Status</th>
                              <th className="p-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {warehouseReturns.map((ret, idx) => (
                              <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="p-3">{new Date(ret.returnDate).toLocaleDateString()}</td>
                                <td className="p-3 font-mono text-xs">{ret.returnId}</td>
                                <td className="p-3">{ret.branch}</td>
                                <td className="p-3 font-mono text-xs">{ret.barcode}</td>
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{ret.category}</p>
                                    <p className="text-xs text-gray-500">{ret.subcategory}</p>
                                  </div>
                                </td>
                                <td className="p-3">{ret.weight}g</td>
                                <td className="p-3 font-semibold text-orange-600">₹{ret.costPrice?.toLocaleString()}</td>
                                <td className="p-3">{ret.returnReason}</td>
                                <td className="p-3">
                                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">
                                    {ret.status}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={() => setSelectedReturn(ret)}
                                    className="text-purple-600 hover:text-purple-700"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {customerReturns.length === 0 && warehouseReturns.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                    <Package className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-500">No returns found for the selected filters</p>
                  </div>
                )}
              </>
            )}
          </TASection>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Return Details</h3>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Return ID</p>
                    <p className="font-semibold">{selectedReturn.returnId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Branch</p>
                    <p className="font-semibold">{selectedReturn.branch}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-semibold">{new Date(selectedReturn.returnDate).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-semibold">{selectedReturn.status}</p>
                  </div>
                  {selectedReturn.invoiceId && (
                    <div>
                      <p className="text-gray-500">Invoice ID</p>
                      <p className="font-semibold">{selectedReturn.invoiceId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Barcode</p>
                    <p className="font-semibold font-mono">{selectedReturn.barcode}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-semibold">{selectedReturn.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Subcategory</p>
                    <p className="font-semibold">{selectedReturn.subcategory}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Weight</p>
                    <p className="font-semibold">{selectedReturn.weight}g</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="font-semibold">
                      ₹{(selectedReturn.sellingPrice || selectedReturn.costPrice || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Return Reason</p>
                    <p className="font-semibold">{selectedReturn.returnReason}</p>
                  </div>
                  {selectedReturn.remarks && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Remarks</p>
                      <p className="font-semibold">{selectedReturn.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
