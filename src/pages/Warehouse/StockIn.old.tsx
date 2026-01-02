// src/pages/Warehouse/StockIn.tsx - Category-wise Stock Entry System
import { useEffect, useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Package, CheckCircle, AlertTriangle, Search, Trash2, ChevronDown, ChevronUp, XCircle } from "lucide-react";

import { getTaggedItems, TaggedItem, deleteAllTaggedItems } from "../../firebase/tagged";
import { addWarehouseStock, getWarehouseStock, WarehouseStockItem } from "../../firebase/warehouse";
import { useCategories } from "../../hooks/useCategories";

const inputStyle =
  "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary";

export default function StockIn() {
  const { categories } = useCategories();
  const [taggedItems, setTaggedItems] = useState<TaggedItem[]>([]);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Load tagged items and existing warehouse stock
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tagged, warehouse] = await Promise.all([
        getTaggedItems(),
        getWarehouseStock(),
      ]);

      // Filter out items already in warehouse stock
      const warehouseBarcodes = new Set(warehouse.map(w => w.barcode));
      const availableTagged = tagged.filter(t => !warehouseBarcodes.has(t.label));

      setTaggedItems(availableTagged);
      setWarehouseStock(warehouse);
      toast.success(`Loaded ${availableTagged.length} labeled items ready for stock-in`);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Group items by category
  const itemsByCategory = taggedItems.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, TaggedItem[]>);

  // Filter items within each category
  const getFilteredItemsForCategory = (categoryItems: TaggedItem[]) => {
    return categoryItems.filter(item => {
      const matchesSearch = !searchText || 
        item.label.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.subcategory || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (item.location || "").toLowerCase().includes(searchText.toLowerCase());

      const matchesStatus = filterStatus === "all" || item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    taggedItems.forEach(item => {
      if (item.id) all[item.id] = true;
    });
    setSelectedIds(all);
  };

  const deselectAll = () => setSelectedIds({});

  const selectCategory = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const newSelected = { ...selectedIds };
    items.forEach(item => {
      if (item.id) newSelected[item.id] = true;
    });
    setSelectedIds(newSelected);
  };

  const deselectCategory = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const newSelected = { ...selectedIds };
    items.forEach(item => {
      if (item.id) delete newSelected[item.id];
    });
    setSelectedIds(newSelected);
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Clear all tagged stock from database
  const clearAllStock = async () => {
    if (taggedItems.length === 0) {
      toast.error("No items to delete");
      return;
    }

    const loadingToast = toast.loading(`Deleting ${taggedItems.length} items...`);
    
    try {
      const deletedCount = await deleteAllTaggedItems();
      toast.dismiss(loadingToast);
      toast.success(`🗑️ Successfully deleted ${deletedCount} items from tagged stock!`);
      
      // Reset states and reload
      setSelectedIds({});
      setShowDeleteModal(false);
      await loadData();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to delete items");
      console.error(error);
    }
  };

  // Stock-in selected items
  const stockInSelected = async () => {
    const selectedItemIds = Object.keys(selectedIds).filter(k => selectedIds[k]);
    
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item to stock-in");
      return;
    }

    const itemsToStockIn = taggedItems.filter(item => item.id && selectedItemIds.includes(item.id));

    const loadingToast = toast.loading(`Stocking in ${itemsToStockIn.length} items...`);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const item of itemsToStockIn) {
        try {
          await addWarehouseStock({
            barcode: item.label,
            category: item.category,
            subcategory: item.subcategory || "",
            location: item.location || "",
            weight: item.weight || "",
            purity: item.purity || "Gold Forming",
            costPrice: item.price || 0,
            status: "in_stock",
            taggedItemId: item.id || "",
            stockInDate: new Date(),
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to stock-in item ${item.label}:`, error);
          failedCount++;
        }
      }

      toast.dismiss(loadingToast);

      if (successCount > 0 && failedCount === 0) {
        toast.success(`🎉 Successfully stocked-in ${successCount} items!`);
      } else if (successCount > 0 && failedCount > 0) {
        toast.success(`Stocked-in ${successCount} items. ${failedCount} failed.`, { duration: 5000 });
      } else {
        toast.error("Failed to stock-in items");
      }

      // Reload data
      setSelectedIds({});
      await loadData();

    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error during stock-in process");
      console.error(error);
    }
  };

  // Calculate statistics
  const stats = {
    totalLabeled: taggedItems.length,
    pending: taggedItems.filter(t => t.status === "pending").length,
    approved: taggedItems.filter(t => t.status === "approved").length,
    rejected: taggedItems.filter(t => t.status === "rejected").length,
    inWarehouse: warehouseStock.filter(w => w.status === "in_stock").length,
    distributed: warehouseStock.filter(w => w.status === "distributed").length,
  };

  // Get category stats
  const getCategoryStats = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const selected = items.filter(item => item.id && selectedIds[item.id]).length;
    return { total: items.length, selected };
  };

  return (
    <>
      <PageMeta
        title="Stock In - Label Based"
        description="Stock-in labeled items to warehouse"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📦 Stock In - Category Wise Entry"
            subtitle="Stock-in labeled items organized by categories with serial tracking"
          >
            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <Package className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Tagged</span>
                <h4 className="mt-1 font-bold text-gray-800 text-lg dark:text-white/90">
                  {stats.totalLabeled}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                <h4 className="mt-1 font-bold text-yellow-600 text-lg dark:text-yellow-400">
                  {stats.pending}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Approved</span>
                <h4 className="mt-1 font-bold text-green-600 text-lg dark:text-green-400">
                  {stats.approved}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <XCircle className="text-red-600 dark:text-red-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Rejected</span>
                <h4 className="mt-1 font-bold text-red-600 text-lg dark:text-red-400">
                  {stats.rejected}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <CheckCircle className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">In Warehouse</span>
                <h4 className="mt-1 font-bold text-blue-600 text-lg dark:text-blue-400">
                  {stats.inWarehouse}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <span className="text-xl">📤</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Distributed</span>
                <h4 className="mt-1 font-bold text-gray-800 text-lg dark:text-white/90">
                  {stats.distributed}
                </h4>
              </div>
            </div>

            {/* Instructions */}
            {/* <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">📋 Stock-In Process:</h3>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                <li>Review labeled items from tagging system (shown below)</li>
                <li>Select items to stock-in to warehouse</li>
                <li>Click "Stock In Selected" to move items to warehouse inventory</li>
                <li>Items will be tracked by their unique barcodes</li>
                <li>Once stocked-in, items are ready for distribution</li>
              </ol>
            </div> */}

            {/* Filters & Actions */}
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    <Search className="inline mr-1" size={16} />
                    Search
                  </label>
                  <input
                    type="text"
                    className={inputStyle}
                    placeholder="Search by barcode, category, location..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    Filter by Status
                  </label>
                  <select
                    className={inputStyle}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">⏳ Pending Review</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    Selected Items
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium"
                      onClick={selectAll}
                    >
                      Select All
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium"
                      onClick={deselectAll}
                    >
                      Deselect
                    </button>
                    <button
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl transition-colors text-sm font-medium flex items-center gap-2"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={taggedItems.length === 0}
                    >
                      <Trash2 size={16} />
                      Clear All Stock
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={stockInSelected}
                  disabled={Object.values(selectedIds).filter(Boolean).length === 0 || loading}
                >
                  <CheckCircle size={18} />
                  Stock In ({Object.values(selectedIds).filter(Boolean).length})
                </button>
              </div>
            </div>

            {/* Category-wise Panels */}
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-4xl mb-2">⏳</div>
                <p className="font-medium">Loading labeled items...</p>
              </div>
            ) : taggedItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-4xl mb-2">📦</div>
                <p className="font-medium">No items found</p>
                <p className="text-sm mt-1">
                  {searchText ? "Try adjusting your search" : "All labeled items have been stocked-in!"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(itemsByCategory).sort().map((categoryName) => {
                  const categoryItems = getFilteredItemsForCategory(itemsByCategory[categoryName]);
                  const stats = getCategoryStats(categoryName);
                  const isExpanded = expandedCategories[categoryName] ?? true;

                  if (categoryItems.length === 0) return null;

                  return (
                    <div
                      key={categoryName}
                      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
                    >
                      {/* Category Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => toggleCategory(categoryName)}
                              className="p-1 hover:bg-white/50 dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp size={20} className="text-gray-700 dark:text-gray-300" />
                              ) : (
                                <ChevronDown size={20} className="text-gray-700 dark:text-gray-300" />
                              )}
                            </button>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                💎 {categoryName}
                                <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                                  ({stats.total} items)
                                </span>
                              </h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                {stats.selected} selected • Serial tracking enabled
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => selectCategory(categoryName)}
                              className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-colors text-xs font-medium"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => deselectCategory(categoryName)}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-xs font-medium"
                            >
                              Deselect
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Category Table */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5">
                              <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                                <th className="p-3 w-12">
                                  <input
                                    type="checkbox"
                                    checked={categoryItems.length > 0 && categoryItems.every(item => item.id && selectedIds[item.id])}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        selectCategory(categoryName);
                                      } else {
                                        deselectCategory(categoryName);
                                      }
                                    }}
                                    className="w-4 h-4 cursor-pointer"
                                  />
                                </th>
                                <th className="p-3 text-xs font-semibold">Serial</th>
                                <th className="p-3 text-xs font-semibold">Barcode</th>
                                <th className="p-3 text-xs font-semibold">Item Name</th>
                                <th className="p-3 text-xs font-semibold">Design/Type</th>
                                <th className="p-3 text-xs font-semibold">Location</th>
                                <th className="p-3 text-xs font-semibold">Purity</th>
                                <th className="p-3 text-xs font-semibold">Status</th>
                              </tr>
                            </thead>

                            <tbody>
                              {categoryItems.map((item, idx) => (
                                <tr
                                  key={item.id}
                                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                  <td className="p-3">
                                    <input
                                      type="checkbox"
                                      checked={!!(item.id && selectedIds[item.id])}
                                      onChange={() => item.id && toggleSelect(item.id)}
                                      className="w-4 h-4 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {item.serial || `-`}
                                  </td>
                                  <td className="p-3">
                                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                                      {item.label}
                                    </span>
                                  </td>
                                  <td className="p-3 font-medium text-gray-800 dark:text-white/90">
                                    {item.remark || "-"}
                                  </td>
                                  <td className="p-3 text-gray-600 dark:text-gray-400">
                                    <div className="flex flex-col gap-1">
                                      <span>{item.subcategory || "-"}</span>
                                      {item.costPriceType && (
                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded w-fit">
                                          {item.costPriceType}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                    {item.location || "-"}
                                  </td>
                                  <td className="p-3">
                                    <span className="font-mono text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                                      {item.purity || "Gold Forming"}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                        item.status === "pending"
                                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                          : item.status === "approved"
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                          : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                      }`}
                                    >
                                      {item.status === "pending" ? "⏳ Pending" : item.status === "approved" ? "✅ Approved" : "❌ Rejected"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Info */}
            {/* <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>💡 Category-Wise Stock-In:</strong> Items are organized by category from the Tagging system with serial tracking. 
                Each batch preserves its category-wise serial numbers (e.g., MG-RNG-25-001). 
                Expand/collapse categories, select items within each category, or use "Select All" to stock multiple categories at once.
              </p>
            </div> */}
          </TASection>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Clear All Tagged Stock?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                This will <strong>permanently delete all {taggedItems.length} tagged items</strong> from the database. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllStock}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
