// src/pages/Warehouse/StockIn.tsx - NEW: Unified System with Barcode Scanning
import { useEffect, useState, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  Package,
  CheckCircle,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trash2,
  Scan,
} from "lucide-react";

import {
  getItemsByStatus,
  stockInItems,
  WarehouseItem,
  getItemByBarcode,
  getItemCountByStatus,
  deleteWarehouseItem,
} from "../../firebase/warehouseItems";
import BarcodeScanner from "../../components/common/BarcodeScanner";

const inputStyle =
  "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary";

export default function StockIn() {
  // State
  const [taggedItems, setTaggedItems] = useState<WarehouseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [stocking, setStocking] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Barcode scanner state
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannedQueue, setScannedQueue] = useState<WarehouseItem[]>([]);

  // Load tagged items - SIMPLE FLAT STRUCTURE
  useEffect(() => {
    loadTaggedItems();
    loadStatusCounts();
  }, []);

  const loadTaggedItems = async () => {
    setLoading(true);
    try {
      console.log("🔍 Loading items with status: 'printed' from warehouseItems collection");
      
      const items = await getItemsByStatus("printed");

      console.log(`✅ Query returned ${items.length} items`);
      if (items.length > 0) {
        console.log("📦 First 3 items:", items.slice(0, 3));
      }
      
      setTaggedItems(items);

      if (items.length === 0) {
        console.warn("⚠️ No items with status='printed' found");
        toast("No printed items found. Print labels from Tagging page first.", {
          icon: "ℹ️",
          duration: 5000,
        });
      } else {
        toast.success(`Loaded ${items.length} items ready for stock-in`);
      }
    } catch (error) {
      console.error("❌ Error loading items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const loadStatusCounts = async () => {
    try {
      const counts = await getItemCountByStatus();
      setStatusCounts(counts);
    } catch (error) {
      console.error("Error loading status counts:", error);
    }
  };

  // Barcode scanner handler
  const handleBarcodeScan = async (barcode: string) => {
    try {
      const item = await getItemByBarcode(barcode);

      if (!item) {
        toast.error(`Item not found: ${barcode}`);
        return;
      }

      if (item.status !== "printed") {
        toast.error(`Item ${barcode} is not ready for stock-in. Status: ${item.status}`);
        return;
      }

      if (selectedIds.has(item.id!)) {
        toast(`Item ${barcode} already selected`, { icon: "ℹ️" });
        return;
      }

      setSelectedIds((prev) => new Set(prev).add(item.id!));
      setScannedQueue((prev) => [item, ...prev].slice(0, 10));

      toast.success(`✅ Added: ${barcode} (${item.category})`);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Clear scanned queue
  const clearScannedQueue = () => {
    setScannedQueue([]);
  };

  // Group items by category
  const itemsByCategory = useMemo(() => {
    return taggedItems.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, WarehouseItem[]>);
  }, [taggedItems]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    return Array.from(new Set(taggedItems.map((i) => i.category))).sort();
  }, [taggedItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return taggedItems.filter((item) => {
      const matchesSearch =
        !searchText ||
        item.barcode.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.subcategory || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (item.remark || "").toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = !filterCategory || item.category === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [taggedItems, searchText, filterCategory]);

  // Get filtered items for a category
  const getFilteredItemsForCategory = (categoryItems: WarehouseItem[]) => {
    return categoryItems
      .filter((item) => {
        const matchesSearch =
          !searchText ||
          item.barcode.toLowerCase().includes(searchText.toLowerCase()) ||
          (item.subcategory || "").toLowerCase().includes(searchText.toLowerCase()) ||
          (item.remark || "").toLowerCase().includes(searchText.toLowerCase());

        return matchesSearch;
      })
      .sort((a, b) => a.serial - b.serial); // Sort by serial number
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allIds = filteredItems.map((i) => i.id!).filter(Boolean);
    setSelectedIds(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectCategory = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const filteredCategoryItems = getFilteredItemsForCategory(items);
    const newSet = new Set(selectedIds);
    filteredCategoryItems.forEach((item) => {
      if (item.id) newSet.add(item.id);
    });
    setSelectedIds(newSet);
  };

  const deselectCategory = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const filteredCategoryItems = getFilteredItemsForCategory(items);
    const newSet = new Set(selectedIds);
    filteredCategoryItems.forEach((item) => {
      if (item.id) newSet.delete(item.id);
    });
    setSelectedIds(newSet);
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  // Stock-in selected items
  const handleStockIn = async () => {
    const selectedItems = taggedItems.filter((i) => i.id && selectedIds.has(i.id));

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to stock-in");
      return;
    }

    // Validate items
    // TODO: Update validation to work with WarehouseItemStructured
    // try {
    //   validateStockInOperation(selectedItems);
    // } catch (error) {
    //   if (error instanceof ValidationError) {
    //     toast.error(error.message);
    //     return;
    //   }
    //   toast.error("Validation failed");
    //   return;
    // }

    setStocking(true);
    const loadingToast = toast.loading(`Stocking in ${selectedItems.length} items...`);

    try {
      const itemIds = selectedItems.map((i) => i.id!);
      // Move items from printed to stocked status
      const stockedCount = await stockInItems(itemIds);

      toast.dismiss(loadingToast);
      toast.success(`🎉 Successfully stocked-in ${stockedCount} items!`);

      // Reload data
      setSelectedIds(new Set());
      await loadTaggedItems();
      await loadStatusCounts();
    } catch (error) {
      console.error("Error stocking in items:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to stock-in items");
    } finally {
      setStocking(false);
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    const selectedItems = taggedItems.filter((i) => i.id && selectedIds.has(i.id));

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to delete");
      return;
    }

    const confirmation = window.confirm(
      `⚠️ Are you sure you want to delete ${selectedItems.length} item(s)?\n\nThis action cannot be undone!`
    );

    if (!confirmation) return;

    const loadingToast = toast.loading(`Deleting ${selectedItems.length} items...`);

    try {
      // Delete from printed subcollection
      for (const item of selectedItems) {
        await deleteWarehouseItem(item.id!, "printed");
      }

      toast.dismiss(loadingToast);
      toast.success(`🗑️ Successfully deleted ${selectedItems.length} items!`);

      // Reload data
      setSelectedIds(new Set());
      await loadTaggedItems();
      await loadStatusCounts();
    } catch (error) {
      console.error("Error deleting items:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to delete items");
    }
  };

  // Delete single item
  const handleDeleteItem = async (itemId: string, itemBarcode: string) => {
    const confirmation = window.confirm(
      `⚠️ Delete item ${itemBarcode}?\n\nThis action cannot be undone!`
    );

    if (!confirmation) return;

    const loadingToast = toast.loading("Deleting item...");

    try {
      await deleteWarehouseItem(itemId, "printed");

      toast.dismiss(loadingToast);
      toast.success(`🗑️ Item ${itemBarcode} deleted!`);

      // Remove from selection if selected
      if (selectedIds.has(itemId)) {
        const newSet = new Set(selectedIds);
        newSet.delete(itemId);
        setSelectedIds(newSet);
      }

      // Reload data
      await loadTaggedItems();
      await loadStatusCounts();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to delete item");
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      totalReady: taggedItems.length,
      filtered: filteredItems.length,
      selected: selectedIds.size,
      totalPrinted: statusCounts.printed || 0,
      totalStocked: statusCounts.stocked || 0,
      totalDistributed: statusCounts.distributed || 0,
    };
  }, [taggedItems, filteredItems, selectedIds, statusCounts]);

  // Get category stats
  const getCategoryStats = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const filteredCategoryItems = getFilteredItemsForCategory(items);
    const selected = filteredCategoryItems.filter((item) => item.id && selectedIds.has(item.id))
      .length;
    return { total: filteredCategoryItems.length, selected };
  };

  return (
    <>
      <PageMeta
        title="Stock In - Barcode Based"
        description="Stock-in printed items using barcode scanner"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📦 Stock-In System"
            subtitle="Scan barcodes or select items to stock-in to warehouse"
          >
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-1">
                    📋 Stock-In Process
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Items from Tagging page are shown here. Use the barcode scanner for quick
                    item lookup, or manually select items from the list below. Items will be moved to
                    warehouse stock and ready for distribution.
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <span className="text-xl">🏷️</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Ready Items</span>
                <h4 className="mt-1 font-bold text-gray-800 text-lg dark:text-white/90">
                  {stats.totalReady}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <Search className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Filtered</span>
                <h4 className="mt-1 font-bold text-purple-600 text-lg dark:text-purple-400">
                  {stats.filtered}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Selected</span>
                <h4 className="mt-1 font-bold text-green-600 text-lg dark:text-green-400">
                  {stats.selected}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Printed</span>
                <h4 className="mt-1 font-bold text-gray-800 text-lg dark:text-white/90">
                  {stats.totalPrinted}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <Package className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">In Stock</span>
                <h4 className="mt-1 font-bold text-blue-600 text-lg dark:text-blue-400">
                  {stats.totalStocked}
                </h4>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <span className="text-xl">📤</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Distributed</span>
                <h4 className="mt-1 font-bold text-gray-800 text-lg dark:text-white/90">
                  {stats.totalDistributed}
                </h4>
              </div>
            </div>

            {/* Barcode Scanner Section */}
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-400">
                  <Scan size={18} />
                  🔍 Barcode Scanner Mode
                </label>
                <button
                  onClick={() => setScannerEnabled(!scannerEnabled)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${scannerEnabled
                      ? "bg-indigo-500 text-white hover:bg-indigo-600"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                >
                  {scannerEnabled ? "Scanner Active" : "Enable Scanner"}
                </button>
              </div>

              {scannerEnabled && (
                <div className="space-y-3">
                  <BarcodeScanner
                    onScan={handleBarcodeScan}
                    placeholder="Scan barcode to add item to stock-in queue..."
                    disabled={loading || stocking}
                  />

                  {/* Scanned Queue Display */}
                  {scannedQueue.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          📋 Recently Scanned ({scannedQueue.length})
                        </h4>
                        <button
                          onClick={clearScannedQueue}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {scannedQueue.map((item, index) => (
                          <div
                            key={`${item.id}-${index}`}
                            className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded"
                          >
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {item.barcode}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {item.category}
                            </span>
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 rounded p-2">
                    💡 <strong>Quick Tip:</strong> Scan barcodes to quickly add items to stock-in queue.
                    Items will be automatically selected and ready for stock-in. Perfect for handling large quantities!
                  </div>
                </div>
              )}
            </div>

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
                    placeholder="Search by barcode, category, remark..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    💎 Filter by Category
                  </label>
                  <select
                    className={inputStyle}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Categories ({taggedItems.length})</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({itemsByCategory[cat]?.length || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    Quick Actions
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium"
                      onClick={selectAll}
                      disabled={loading}
                    >
                      Select All
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium"
                      onClick={deselectAll}
                      disabled={loading}
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center gap-3">
                {/* Left side - Delete button (only show when items selected) */}
                {selectedIds.size > 0 && (
                  <button
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleDeleteSelected}
                    disabled={loading || stocking}
                  >
                    <Trash2 size={18} />
                    Delete Selected ({selectedIds.size})
                  </button>
                )}

                {/* Right side - Stock In button */}
                <div className="ml-auto">
                  <button
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={handleStockIn}
                    disabled={selectedIds.size === 0 || loading || stocking}
                  >
                    <CheckCircle size={18} />
                    Stock In ({selectedIds.size})
                  </button>
                </div>
              </div>
            </div>

            {/* Category-wise Panels */}
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-4xl mb-2">⏳</div>
                <p className="font-medium">Loading printed items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-4xl mb-2">📦</div>
                <p className="font-medium">No items found</p>
                <p className="text-sm mt-1">
                  {searchText || filterCategory
                    ? "Try adjusting your filters"
                    : "Create and save items in the Tagging page first"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(itemsByCategory)
                  .sort()
                  .map((categoryName) => {
                    if (filterCategory && filterCategory !== categoryName) return null;

                    const categoryItems = getFilteredItemsForCategory(
                      itemsByCategory[categoryName]
                    );
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
                                  <ChevronUp
                                    size={20}
                                    className="text-gray-700 dark:text-gray-300"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={20}
                                    className="text-gray-700 dark:text-gray-300"
                                  />
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
                                  {stats.selected} selected • Ready for stock-in
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
                                      checked={
                                        categoryItems.length > 0 &&
                                        categoryItems.every(
                                          (item) => item.id && selectedIds.has(item.id)
                                        )
                                      }
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
                                  <th className="p-3 text-xs font-semibold">Type</th>
                                  <th className="p-3 text-xs font-semibold">Design</th>
                                  <th className="p-3 text-xs font-semibold">Location</th>
                                  <th className="p-3 text-xs font-semibold">Status</th>
                                  <th className="p-3 text-xs font-semibold">Printed At</th>
                                  <th className="p-3 text-xs font-semibold text-center">Actions</th>
                                </tr>
                              </thead>

                              <tbody>
                                {categoryItems.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                  >
                                    <td className="p-3">
                                      <input
                                        type="checkbox"
                                        checked={!!(item.id && selectedIds.has(item.id))}
                                        onChange={() => item.id && toggleSelect(item.id)}
                                        className="w-4 h-4 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {item.serial}
                                    </td>
                                    <td className="p-3">
                                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                                        {item.barcode}
                                      </span>
                                    </td>
                                    <td className="p-3 font-medium text-gray-800 dark:text-white/90">
                                      {item.remark || "-"}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                      {item.costPriceType || "-"}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                      {item.subcategory || "-"}
                                    </td>
                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                      {item.location}
                                    </td>
                                    <td className="p-3">
                                      <span
                                        className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                      >
                                        Ready
                                      </span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(item.createdAt).toLocaleString()}
                                    </td>
                                    <td className="p-3">
                                      <div className="flex justify-center">
                                        <button
                                          onClick={() => item.id && handleDeleteItem(item.id, item.barcode)}
                                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors dark:bg-red-600 dark:hover:bg-red-700"
                                          title="Delete item"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
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
          </TASection>
        </div>
      </div>
    </>
  );
}
