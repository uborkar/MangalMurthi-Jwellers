// src/pages/Warehouse/Distribution.tsx
import { useEffect, useState, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Check, Truck, Package, Filter as FilterIcon, ChevronDown, ChevronUp, Scan } from "lucide-react";

import {
  getItemsByStatus,
  distributeItems,
  WarehouseItem,
  getItemByBarcode,
} from "../../firebase/warehouseItems";
import { validateDistributionOperation, ValidationError } from "../../utils/validation";
import { writeBatch, doc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import BarcodeScanner from "../../components/common/BarcodeScanner";

const inputStyle =
  "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

// ============================================
// 🏢 SHOP/BRANCH CONFIGURATION
// ============================================
interface ShopConfig {
  code: string;
  name: string;
  location: string;
  type: "flagship" | "branch" | "franchise";
}

const shops: ShopConfig[] = [
  { code: "Sangli", name: "Sangli", location: "Sangli", type: "branch" },
  { code: "Kolhapur", name: "Kolhapur", location: "Kolhapur", type: "branch" },
  { code: "Miraj", name: "Miraj", location: "Miraj", type: "branch" },
  { code: "Pune", name: "Pune", location: "Pune", type: "branch" },
  { code: "Satara1", name: "Satara 1", location: "Satara", type: "branch" },
  { code: "Satara2", name: "Satara 2", location: "Satara", type: "branch" },
  { code: "Karad1", name: "Karad 1", location: "Karad", type: "branch" },
  { code: "Karad2", name: "Karad 2", location: "Karad", type: "branch" },
];

export default function Distribution() {
  const [inventory, setInventory] = useState<WarehouseItem[]>([]);
  const [allInventory, setAllInventory] = useState<WarehouseItem[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal] = useState(false);

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Barcode scanner state
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannedQueue, setScannedQueue] = useState<WarehouseItem[]>([]);

  async function loadInventory() {
    try {
      const loadingToast = toast.loading("Loading stocked items...");
      const data = await getItemsByStatus("stocked");
      setInventory(data);
      setAllInventory(data);
      toast.dismiss(loadingToast);
      toast.success(`Loaded ${data.length} items available for distribution`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory");
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  // FILTERING LOGIC
  useEffect(() => {
    let filtered = [...allInventory];

    if (filterCategory) {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(item =>
        item.barcode?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.remark?.toLowerCase().includes(search)
      );
    }

    setInventory(filtered);
  }, [searchText, filterCategory, allInventory]);

  // Get unique categories
  const allCategories = useMemo(() => {
    return Array.from(new Set(allInventory.map(item => item.category).filter(Boolean)));
  }, [allInventory]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, WarehouseItem[]>);
  }, [inventory]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const selectCategory = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const newSelected = { ...selected };
    items.forEach((item) => {
      if (item.id) newSelected[item.id] = true;
    });
    setSelected(newSelected);
  };

  const deselectCategory = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const newSelected = { ...selected };
    items.forEach((item) => {
      if (item.id) delete newSelected[item.id];
    });
    setSelected(newSelected);
  };

  const getCategoryStats = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const selectedCount = items.filter((item) => item.id && selected[item.id]).length;
    return { total: items.length, selected: selectedCount };
  };

  const toggleRow = (id: string) => {
    setSelected((p) => ({
      ...p,
      [id]: !p[id],
    }));
  };

  const selectAll = () => {
    const newSelected: Record<string, boolean> = {};
    inventory.forEach(item => {
      if (item.id) newSelected[item.id] = true;
    });
    setSelected(newSelected);
  };

  const deselectAll = () => setSelected({});

  // Barcode scanner handler
  const handleBarcodeScan = async (barcode: string) => {
    try {
      // Find item by barcode
      const item = await getItemByBarcode(barcode);

      if (!item) {
        toast.error(`Item not found: ${barcode}`);
        return;
      }

      // Check if item is ready for distribution (must be stocked)
      if (item.status !== "stocked") {
        toast.error(
          `Item ${barcode} is not ready for distribution. Status: ${item.status}`
        );
        return;
      }

      // Check if item is in the current inventory list
      const itemInList = allInventory.find((i) => i.id === item.id);
      if (!itemInList) {
        toast.error(`Item ${barcode} not found in warehouse stock`);
        return;
      }

      // Check if already selected
      if (item.id && selected[item.id]) {
        toast(`Item ${barcode} already in queue`, { icon: "ℹ️" });
        return;
      }

      // Add to selection
      if (item.id) {
        setSelected((prev) => ({
          ...prev,
          [item.id!]: true,
        }));
        
        // Add to scanned queue for visual feedback
        setScannedQueue((prev) => [item, ...prev].slice(0, 10)); // Keep last 10
        
        toast.success(`✅ Added: ${barcode} (${item.category})`);
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };
  
  // Clear scanned queue
  const clearScannedQueue = () => {
    setScannedQueue([]);
  };

  const selectedItems = inventory.filter((i) => i.id && selected[i.id]);
  const totalQty = selectedItems.length;

  // Statistics
  const stats = useMemo(() => ({
    total: allInventory.length,
    filtered: inventory.length,
    selected: totalQty,
  }), [allInventory, inventory, totalQty]);

  // Lock body scroll when modal opens
  useEffect(() => {
    if (confirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [confirmModal]);

  const handleConfirm = async () => {
    if (!selectedShop) {
      toast.error("Please select a destination shop");
      return;
    }

    if (!selectedItems.length) {
      toast.error("No items selected for transfer");
      return;
    }

    // Validate distribution
    try {
      validateDistributionOperation(selectedItems, selectedShop);
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message);
        return;
      }
      toast.error("Validation failed");
      return;
    }

    const loadingToast = toast.loading(
      `Transferring ${selectedItems.length} items to ${selectedShop}...`
    );

    try {
      const itemIds = selectedItems.map((i) => i.id!);

      // Distribute items (updates status to "distributed")
      const distributedCount = await distributeItems(itemIds, selectedShop, "current-user");

      // Get current shop stock count for serial numbering
      const shopStockRef = collection(db, "shops", selectedShop, "stockItems");
      const shopStockSnap = await getDocs(shopStockRef);
      let branchSerial = shopStockSnap.size + 1; // Start from next available serial

      // Create shop stock items with branch-specific serials
      const batch = writeBatch(db);
      selectedItems.forEach((item) => {
        const newStockRef = doc(collection(db, "shops", selectedShop, "stockItems"));
        batch.set(newStockRef, {
          // Core identification fields
          serial: branchSerial++, // Branch-specific serial (1, 2, 3...)
          label: item.barcode,
          barcode: item.barcode,
          
          // Item details (5 core fields from Tagging)
          category: item.category,
          remark: item.remark, // Item Name
          subcategory: item.subcategory, // Design
          costPriceType: item.costPriceType, // Type
          location: item.location,
          
          // Additional fields
          productName: item.remark, // Alias for compatibility
          type: item.costPriceType, // Alias for compatibility
          design: item.subcategory, // Alias for compatibility
          
          // Status and tracking
          status: "in-branch",
          warehouseItemId: item.id,
          warehouseSerial: item.serial, // Keep original warehouse serial for reference
          transferredAt: new Date().toISOString(),
          transferredFrom: "Warehouse",
        });
      });
      await batch.commit();

      toast.dismiss(loadingToast);
      toast.success(
        `🎉 Successfully transferred ${distributedCount} items to ${selectedShop}!`
      );

      // Reset and reload
      setSelected({});
      setSelectedShop("");
      setConfirmModal(false);

      const fresh = await getItemsByStatus("stocked");
      setInventory(fresh);
      setAllInventory(fresh);
    } catch (err) {
      console.error("Transfer error:", err);
      toast.dismiss(loadingToast);
      toast.error("Transfer failed. Please try again.");
    }
  };


  return (
    <>
      <PageMeta
        title="Distribute Stock"
        description="Send categorized inventory to branch shops"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="Stock Distribution Center"
            subtitle="Distribute approved inventory to branch locations"
          >
            {/* STATISTICS DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Available Inventory</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats.total}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Items ready to ship</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">🔍</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Filtered View</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats.filtered}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">After filters</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Selected</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats.selected}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ready for transfer</p>
                </div>
              </div>
            </div>

            {/* SHOP SELECTION & FILTERS */}
            <div className="mb-6 space-y-4">
              {/* Barcode Scanner Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-400">
                    <Scan size={18} />
                    🔍 Barcode Scanner Mode
                  </label>
                  <button
                    onClick={() => setScannerEnabled(!scannerEnabled)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      scannerEnabled
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
                      placeholder="Scan barcode to add item to distribution queue..."
                      disabled={false}
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
                      💡 <strong>Quick Tip:</strong> Scan barcodes to quickly add items to distribution queue. 
                      Items will be automatically selected and ready for transfer. Perfect for handling large quantities!
                    </div>
                  </div>
                )}
              </div>
              
              {/* Row 1: Shop Selection */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  🏢 Select Destination Branch
                </label>
                <select
                  className={`${inputStyle} w-full md:w-96 font-medium`}
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                >
                  <option value="">Choose destination shop...</option>
                  {shops.map((shop) => (
                    <option key={shop.code} value={shop.code}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2: Filters */}
              <div>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors mb-3 font-medium"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FilterIcon size={16} />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </button>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">🔍 Search</label>
                      <input
                        className={inputStyle}
                        placeholder="Search by barcode, category, item name..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">💎 Category</label>
                      <select
                        className={inputStyle}
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Action Buttons */}
              <div className="flex gap-3 flex-wrap items-center">
                <button
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                  onClick={selectAll}
                >
                  ✓ Select All ({inventory.length})
                </button>

                <button
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium"
                  onClick={deselectAll}
                >
                  ✗ Deselect
                </button>

                <div className="flex-1"></div>

                <button
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-600 dark:hover:bg-green-700"
                  onClick={() => {
                    if (!selectedShop) {
                      toast.error("Please select a destination shop first");
                      return;
                    }
                    if (totalQty === 0) {
                      toast.error("Please select items to transfer");
                      return;
                    }
                    setConfirmModal(true);
                  }}
                  disabled={!selectedShop || totalQty === 0}
                >
                  <Truck size={18} />
                  Transfer Selected ({totalQty})
                </button>
              </div>
            </div>

            {/* CATEGORY-WISE INVENTORY */}
            {inventory.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-4xl mb-2">📦</div>
                <p className="font-medium">No items available for distribution</p>
                <p className="text-sm mt-1">Stock-in items first from the Stock-In page</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(itemsByCategory)
                  .sort()
                  .map((categoryName) => {
                    if (filterCategory && filterCategory !== categoryName) return null;

                    const categoryItems = itemsByCategory[categoryName].sort((a, b) => a.serial - b.serial);
                    const stats = getCategoryStats(categoryName);
                    const isExpanded = expandedCategories[categoryName] ?? true;

                    return (
                      <div
                        key={categoryName}
                        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
                      >
                        {/* Category Header */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 border-b border-gray-200 dark:border-gray-800">
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
                                  {stats.selected} selected • Ready for distribution
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => selectCategory(categoryName)}
                                className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-colors text-xs font-medium"
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
                                        categoryItems.every((item) => item.id && selected[item.id])
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
                                        checked={!!(item.id && selected[item.id])}
                                        onChange={() => item.id && toggleRow(item.id)}
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

            {/* SELECTION SUMMARY */}
            {totalQty > 0 && (
              <div className="mt-6 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Selected Items</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalQty}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Destination</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {selectedShop || "Not selected"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INFO BOX */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Distribution Process:</strong> Select items and destination branch.
                Transferred items will be removed from warehouse inventory and added to the branch's stock.
                Transfer records are maintained for audit purposes.
              </p>
            </div>
          </TASection>
        </div>
      </div>

      {/* ENHANCED CONFIRMATION MODAL */}
      {confirmModal && (
        <div
          className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black/75 flex items-center justify-center z-[99999] p-4 backdrop-blur-lg overflow-y-auto"
          style={{ margin: 0 }}
          onClick={() => setConfirmModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden relative z-[100000]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-green-500 dark:bg-green-600 text-white p-5 border-b-4 border-green-600 dark:border-green-700">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Truck size={28} />
                Confirm Stock Transfer
              </h2>
              <p className="text-green-50 mt-1">Review transfer details before confirming</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {/* Destination Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white rounded-full p-3">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Destination Branch</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {shops.find(s => s.code === selectedShop)?.name || selectedShop}
                    </div>
                    <div className="text-sm text-gray-500">
                      {shops.find(s => s.code === selectedShop)?.location}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalQty}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Items</div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
                  <Package size={18} />
                  Items Being Transferred ({selectedItems.length})
                </h3>
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                      <tr className="text-left">
                        <th className="p-3">Barcode</th>
                        <th className="p-3">Category</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedItems.map((item) => (
                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="p-3">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {item.barcode}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {item.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
                  <strong>⚠️ Important:</strong> This action will remove these items from warehouse inventory and add them to the selected branch's stock. This transfer will be logged for audit purposes.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
              <button
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl font-semibold transition-colors"
                onClick={() => setConfirmModal(false)}
              >
                Cancel
              </button>

              <button
                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-xl font-semibold transition-colors shadow-sm flex items-center gap-2"
                onClick={handleConfirm}
              >
                <Check size={18} />
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
