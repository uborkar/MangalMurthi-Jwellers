import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import { RotateCcw, Trash2, PackageX, Send } from "lucide-react";
import toast from "react-hot-toast";
import {
  addSalesReturn,
  addWarehouseReturn,
} from "../../firebase/salesReturns";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

interface ReturnItem {
  stockItemId: string;
  label: string;
  productName?: string;
  category?: string;
  weight?: string | number;
  purity?: string;
  price: number;
  qty: number;
  returnReason: string;
}

type BranchName = "Sangli" | "Miraj" | "Kolhapur";

const BRANCHES: BranchName[] = ["Sangli", "Miraj", "Kolhapur"];

const RETURN_REASONS = [
  "Defective",
  "Customer Changed Mind",
  "Wrong Item Sent",
  "Quality Issue",
  "Damaged in Transit",
  "Other"
];

// Modern Toast Notifications
const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#10B981',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    icon: '✅',
  });
};

const showErrorToast = (message: string) => {
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#EF4444',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    icon: '❌',
  });
};

const showWarningToast = (message: string) => {
  toast.error(message, {
    duration: 4500,
    position: 'top-right',
    style: {
      background: '#F59E0B',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    icon: '⚠️',
  });
};

const showInfoToast = (message: string) => {
  toast(message, {
    duration: 3500,
    position: 'top-right',
    style: {
      background: '#3B82F6',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    icon: 'ℹ️',
  });
};

const showLoadingToast = (message: string) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#6366F1',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
  });
};

export default function SalesReturn() {
  const inputClass =
    "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  const [selectedBranch, setSelectedBranch] = useState<BranchName>("Sangli");
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in-branch" | "sold">("all");

  // ---------------------- LOAD BRANCH STOCK ----------------------
  const loadBranchStock = async () => {
    const loadingToastId = showLoadingToast(`Loading ${selectedBranch} stock...`);
    
    try {
      setLoading(true);
      console.log(`🔄 Loading stock for branch: ${selectedBranch}`);
      console.log(`📍 Path: shops/${selectedBranch}/stockItems`);
      
      const stock = await getShopStock(selectedBranch);
      console.log(`✅ Loaded ${stock.length} items from ${selectedBranch}`);
      
      // Log first few items to verify data
      if (stock.length > 0) {
        console.log("Sample items:", stock.slice(0, 3));
      }
      
      setBranchStock(stock);
      toast.dismiss(loadingToastId);
      
      if (stock.length === 0) {
        showWarningToast(`No stock items found in ${selectedBranch} branch`);
      } else {
        showSuccessToast(`✨ Loaded ${stock.length} items from ${selectedBranch}`);
      }
    } catch (error) {
      console.error("Error loading branch stock:", error);
      toast.dismiss(loadingToastId);
      showErrorToast("Failed to load branch stock. Please try again.");
      setBranchStock([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchStock();
    // Reset return items when branch changes
    setReturnItems([]);
    setSearchText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  // Filter stock items by search text and status filter
  const filteredStockItems = branchStock.filter(item => {
    const search = searchText.toLowerCase();
    const matchesSearch = 
      item.label.toLowerCase().includes(search) ||
      (item.productName || "").toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search);
    
    const matchesFilter = 
      stockFilter === "all" || 
      item.status === stockFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Get count by status
  const statusCounts = {
    all: branchStock.length,
    "in-branch": branchStock.filter(i => i.status === "in-branch").length,
    sold: branchStock.filter(i => i.status === "sold").length,
  };

  // ---------------------- ADD ITEM TO RETURN LIST ----------------------
  const addToReturnList = (item: BranchStockItem) => {
    if (!item.id) {
      showErrorToast("Invalid item: Missing ID");
      return;
    }

    // Check if item already in return list
    if (returnItems.some(ri => ri.stockItemId === item.id)) {
      showWarningToast(`${item.label} is already in the return list`);
      return;
    }
    
    const returnItem: ReturnItem = {
      stockItemId: item.id,
      label: item.label,
      productName: item.productName || "Unknown Product",
      category: item.category || "Uncategorized",
      weight: item.weight || item.weightG || 0,
      purity: item.purity || "-",
      price: item.basePrice || item.costPrice || 0,
      qty: 1,
      returnReason: "Customer Changed Mind", // Default reason
    };
    
    setReturnItems((prev) => [...prev, returnItem]);
    showSuccessToast(`✓ ${item.label} added to return list`);
  };

  // ---------------------- UPDATE RETURN ITEM ----------------------
  const updateReturnItem = <K extends keyof ReturnItem>(stockItemId: string, field: K, value: ReturnItem[K]) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.stockItemId === stockItemId ? { ...item, [field]: value } : item
      )
    );
  };

  // ---------------------- REMOVE FROM RETURN LIST ----------------------
  const removeFromReturn = (stockItemId: string) => {
    setReturnItems((prev) => prev.filter((i) => i.stockItemId !== stockItemId));
    showInfoToast("Item removed from return list");
  };

  // ---------------------- SUBMIT RETURN ----------------------
  const submitReturn = async () => {
    if (returnItems.length === 0) {
      showWarningToast("No items selected for return");
      return;
    }

    // Validate all items have reasons
    const itemsWithoutReason = returnItems.filter(item => !item.returnReason);
    if (itemsWithoutReason.length > 0) {
      showWarningToast("Please select return reason for all items");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to return ${returnItems.length} item(s) from ${selectedBranch} to Warehouse?\n\nNote: Items will be removed from ${selectedBranch} branch stock.`
    );

    if (!confirmed) return;

    const loadingToastId = showLoadingToast(`Processing ${returnItems.length} return(s)...`);

    try {
      setLoading(true);
      console.log(`📦 Processing return of ${returnItems.length} items from ${selectedBranch}`);

      let successCount = 0;
      const failedItems: string[] = [];

      // Process each return item
      for (const item of returnItems) {
        try {
          console.log(`Processing return for: ${item.label}`);

          // 1. Add to sales return collection (shop record)
          await addSalesReturn(selectedBranch, {
            invoiceId: "DIRECT-RETURN",
            branch: selectedBranch,
            stockItemId: item.stockItemId,
            label: item.label,
            productName: item.productName || item.label,
            type: item.category || "Unknown",
            location: selectedBranch,
            qty: item.qty,
            price: item.price,
            discount: 0,
            gst: 0,
            net: item.price * item.qty,
            returnDate: new Date().toISOString(),
            status: "pending",
            remarks: item.returnReason,
          });

          // 2. Add to warehouse returns (warehouse record)
          await addWarehouseReturn({
            productName: item.productName || item.label,
            category: item.category || "Unknown",
            label: item.label,
            quantity: item.qty,
            weight: item.weight?.toString() || "0",
            condition: "To Be Inspected",
            remarks: `${item.returnReason} | From ${selectedBranch}`,
            returnedFrom: selectedBranch,
            returnDate: new Date().toISOString(),
            status: "pending",
          });

          // 3. Delete item from branch stock (like ShopTransfer does)
          // This removes the item completely from the branch's inventory
          await deleteDoc(doc(db, "shops", selectedBranch, "stockItems", item.stockItemId));
          console.log(`🗑️ Deleted ${item.label} from ${selectedBranch} branch stock`);

          successCount++;
          console.log(`✅ Successfully processed: ${item.label}`);
        } catch (itemError) {
          console.error(`❌ Failed to process ${item.label}:`, itemError);
          failedItems.push(item.label);
        }
      }

      toast.dismiss(loadingToastId);

      // Show results
      if (successCount === returnItems.length) {
        showSuccessToast(`🎉 Successfully returned ${successCount} item(s) to warehouse!`);
      } else if (successCount > 0) {
        showWarningToast(`Returned ${successCount} items. Failed: ${failedItems.join(", ")}`);
      } else {
        showErrorToast("Failed to process returns");
      }
      
      // Reset and reload
      setReturnItems([]);
      setSearchText("");
      await loadBranchStock();
    } catch (error) {
      console.error("Error processing return:", error);
      toast.dismiss(loadingToastId);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showErrorToast(`Failed to process return: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Sales Return"
        description="Return sold items back to warehouse"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="↩️ Sales Return"
            subtitle="Return sold items back into warehouse stock"
          >
            {/* ---------------------- BRANCH & SEARCH ---------------------- */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  {selectedBranch} Branch Stock
                </h3>
                <button
                  onClick={loadBranchStock}
                  disabled={loading}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 font-medium transition-colors"
                >
                  <RotateCcw size={16} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select
                  className={inputClass}
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchName)}
                  disabled={loading}
                >
                  {BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Search by label, product name, category..."
                  className={inputClass}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStockFilter("all")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    stockFilter === "all"
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  All ({statusCounts.all})
                </button>
                <button
                  onClick={() => setStockFilter("in-branch")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    stockFilter === "in-branch"
                      ? "bg-green-500 text-white dark:bg-green-600"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  In-Branch ({statusCounts["in-branch"]})
                </button>
                <button
                  onClick={() => setStockFilter("sold")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    stockFilter === "sold"
                      ? "bg-orange-500 text-white dark:bg-orange-600"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  Sold ({statusCounts.sold})
                </button>
              </div>
            </div>

            {/* ---------------------- STOCK ITEMS ---------------------- */}
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading stock items...
              </div>
            ) : filteredStockItems.length > 0 ? (
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">
                  Stock Items ({filteredStockItems.length})
                </h3>

                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        {["Label", "Product", "Category", "Weight", "Status", "Price", "Action"].map((h) => (
                          <th key={h} className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">{h}</th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStockItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3 font-mono text-xs text-gray-800 dark:text-white/90">{item.label}</td>
                          <td className="p-3 text-gray-800 dark:text-white/90">{item.productName || "-"}</td>
                          <td className="p-3 text-gray-600 dark:text-gray-400">{item.category || "-"}</td>
                          <td className="p-3 text-gray-800 dark:text-white/90">{item.weightG || item.weight || "-"}g</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              item.status === "sold" 
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                                : item.status === "in-branch"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"
                            }`}>
                              {item.status?.toUpperCase() || "UNKNOWN"}
                            </span>
                          </td>
                          <td className="p-3 text-gray-800 dark:text-white/90 font-medium">₹{(item.basePrice || item.costPrice || 0).toLocaleString()}</td>
                          <td className="p-3">
                            <button
                              onClick={() => addToReturnList(item)}
                              disabled={returnItems.some(ri => ri.stockItemId === item.id)}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors dark:bg-orange-600 dark:hover:bg-orange-700"
                            >
                              {returnItems.some(ri => ri.stockItemId === item.id) ? "Added" : "Add to Return"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl mb-6">
                <PackageX size={48} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No stock items found</p>
                <p className="text-sm mt-1">
                  {searchText ? "Try adjusting your search" : `No items in ${selectedBranch} matching filter: ${stockFilter}`}
                </p>
              </div>
            )}

            {/* ---------------------- RETURN LIST ---------------------- */}
            {returnItems.length > 0 && (
              <div className="p-6 rounded-2xl border-2 border-orange-500 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/20">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90 flex items-center gap-2">
                  <Send size={20} className="text-orange-600" /> Items to Return to Warehouse ({returnItems.length})
                </h3>

                <div className="space-y-3">
                  {returnItems.map((item) => (
                    <div key={item.stockItemId} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                      <div className="grid grid-cols-12 gap-3">
                        {/* Item Details */}
                        <div className="col-span-12 md:col-span-5">
                          <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {item.label}
                          </div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {item.productName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.category} • {item.weight}g • {item.purity}
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 md:col-span-2">
                          <label className="text-xs text-gray-500 dark:text-gray-400">Quantity</label>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateReturnItem(item.stockItemId, "qty", Number(e.target.value))}
                            className="w-full px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                          />
                        </div>

                        {/* Return Reason */}
                        <div className="col-span-8 md:col-span-4">
                          <label className="text-xs text-gray-500 dark:text-gray-400">Return Reason *</label>
                          <select
                            value={item.returnReason}
                            onChange={(e) => updateReturnItem(item.stockItemId, "returnReason", e.target.value)}
                            className="w-full px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] text-sm text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                          >
                            {RETURN_REASONS.map(reason => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))}
                          </select>
                        </div>

                        {/* Remove Button */}
                        <div className="col-span-12 md:col-span-1 flex items-end justify-end">
                          <button
                            onClick={() => removeFromReturn(item.stockItemId)}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center gap-1 text-xs font-medium transition-colors dark:bg-red-600 dark:hover:bg-red-700"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>

                      {/* Price Info */}
                      <div className="mt-2 flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-800 pt-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          Unit Price: ₹{item.price.toLocaleString()}
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-white/90">
                          Total: ₹{(item.price * item.qty).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SUMMARY */}
                <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Items</div>
                      <div className="text-xl font-bold text-gray-800 dark:text-white/90">{returnItems.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Quantity</div>
                      <div className="text-xl font-bold text-gray-800 dark:text-white/90">
                        {returnItems.reduce((sum, item) => sum + item.qty, 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Value</div>
                      <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        ₹{returnItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Branch</div>
                      <div className="text-xl font-bold text-primary dark:text-primary">{selectedBranch}</div>
                    </div>
                  </div>
                </div>

                {/* SUBMIT */}
                <div className="mt-6 flex gap-3 justify-end">
                  <button 
                    onClick={() => setReturnItems([])}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-800"
                  >
                    <Trash2 size={16} /> Clear All
                  </button>
                  <button 
                    onClick={submitReturn}
                    disabled={loading}
                    className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 font-semibold transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <RotateCcw size={16} className="animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Submit Return to Warehouse
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
