// src/pages/Warehouse/Distribution.tsx
import { useEffect, useState, useMemo } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Check, Truck, Package, Filter as FilterIcon } from "lucide-react";

import {
  getAvailableInventory,
  markInventoryTransferred,
  InventoryItem,
} from "../../firebase/inventory";

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
  { code: "Sangli", name: "Sangli Branch", location: "Sangli", type: "flagship" },
  { code: "Miraj", name: "Miraj Branch", location: "Miraj", type: "branch" },
  { code: "Kolhapur", name: "Kolhapur Branch", location: "Kolhapur", type: "branch" },
  { code: "Mumbai", name: "Mumbai Malad", location: "Mumbai", type: "flagship" },
  { code: "Pune", name: "Pune Branch", location: "Pune", type: "branch" },
];

export default function Distribution() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal] = useState(false);
  
  // Filter states
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPurity, setFilterPurity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  async function loadInventory() {
    try {
      const loadingToast = toast.loading("Loading inventory...");
      const data = await getAvailableInventory();
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

    if (filterPurity) {
      filtered = filtered.filter(item => item.purity === filterPurity);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(item =>
        item.label?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.weight?.toLowerCase().includes(search)
      );
    }

    setInventory(filtered);
  }, [searchText, filterCategory, filterPurity, allInventory]);

  // Get unique categories and purities
  const allCategories = useMemo(() => {
    return Array.from(new Set(allInventory.map(item => item.category).filter(Boolean)));
  }, [allInventory]);

  const allPurities = useMemo(() => {
    return Array.from(new Set(allInventory.map(item => item.purity).filter((p): p is string => Boolean(p))));
  }, [allInventory]);

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

  const selectedItems = inventory.filter((i) => i.id && selected[i.id]);
  const totalQty = selectedItems.length;
  const totalWeight = selectedItems.reduce(
    (a, b) => a + (parseFloat(b.weight || "0") || 0),
    0
  );
  const totalValue = selectedItems.reduce(
    (a, b) => a + (b.price || 0),
    0
  );

  // Statistics
  const stats = useMemo(() => ({
    total: allInventory.length,
    filtered: inventory.length,
    selected: totalQty,
    totalValue: allInventory.reduce((sum, item) => sum + (item.price || 0), 0),
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

    const loadingToast = toast.loading(`Transferring ${selectedItems.length} items to ${selectedShop}...`);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const item of selectedItems) {
        try {
          await markInventoryTransferred(item, selectedShop);
          successCount++;
          console.log(`✅ Transferred: ${item.label} → ${selectedShop}`);
        } catch (error) {
          console.error(`Failed to transfer ${item.label}:`, error);
          failedCount++;
        }
      }

      toast.dismiss(loadingToast);

      if (successCount > 0 && failedCount === 0) {
        toast.success(`🎉 Successfully transferred ${successCount} items to ${selectedShop}!`);
      } else if (successCount > 0) {
        toast.success(`Transferred ${successCount} items. ${failedCount} failed.`, { duration: 5000 });
      } else {
        toast.error("Failed to transfer items");
      }

      // Reset and reload
      setSelected({});
      setSelectedShop("");
      setConfirmModal(false);

      const fresh = await getAvailableInventory();
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
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
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Value</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">₹{stats.totalValue.toLocaleString()}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inventory worth</p>
                </div>
              </div>
            </div>

            {/* SHOP SELECTION & FILTERS */}
            <div className="mb-6 space-y-4">
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
                      {shop.name} ({shop.location}) - {shop.type.toUpperCase()}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">🔍 Search</label>
                      <input
                        className={inputStyle}
                        placeholder="Label, category, weight..."
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

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">⚜️ Purity</label>
                      <select
                        className={inputStyle}
                        value={filterPurity}
                        onChange={(e) => setFilterPurity(e.target.value)}
                      >
                        <option value="">All Purities</option>
                        {allPurities.map((purity) => (
                          <option key={purity} value={purity}>{purity}</option>
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

            {/* INVENTORY TABLE */}
            <div className="overflow-x-auto rounded-xl border dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-white/5">
                  <tr className="text-left font-semibold">
                    <th className="p-3 w-12">
                      <input
                        type="checkbox"
                        checked={inventory.length > 0 && inventory.every(item => item.id && selected[item.id])}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll();
                          } else {
                            deselectAll();
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Label</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Purity</th>
                    <th className="p-3">Weight</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={!!(item.id && selected[item.id])}
                          onChange={() => item.id && toggleRow(item.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-semibold text-yellow-600 dark:text-yellow-400">
                          {item.purity || "22K"}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{item.weight}</td>
                      <td className="p-3 font-semibold text-green-600 dark:text-green-400">
                        ₹{item.price?.toLocaleString() || 0}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <Package size={12} className="inline mr-1" />
                          Ready
                        </span>
                      </td>
                    </tr>
                  ))}

                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-2">📦</div>
                        <p className="font-medium">No inventory available</p>
                        <p className="text-sm mt-1">
                          {searchText || filterCategory || filterPurity
                            ? "Try adjusting your filters"
                            : "All items have been distributed to branches"}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* SELECTION SUMMARY */}
            {totalQty > 0 && (
              <div className="mt-6 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Selected Items</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalQty}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Weight</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalWeight.toFixed(2)}g</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalValue.toLocaleString()}</div>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalQty}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Items</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalWeight.toFixed(2)}g</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Weight</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">₹{totalValue.toLocaleString()}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Value</div>
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
                        <th className="p-3">Label</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Purity</th>
                        <th className="p-3">Weight</th>
                        <th className="p-3">Price</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedItems.map((item) => (
                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="p-3">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {item.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-yellow-600 dark:text-yellow-400">
                            {item.purity || "22K"}
                          </td>
                          <td className="p-3 font-medium">{item.weight}</td>
                          <td className="p-3 font-semibold text-green-600 dark:text-green-400">
                            ₹{item.price?.toLocaleString() || 0}
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
