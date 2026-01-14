import React, { useEffect, useMemo, useState } from "react";
import { Download, Printer, Plus, Trash2, Package, TrendingUp, AlertCircle, Search, Scan } from "lucide-react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import toast from "react-hot-toast";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import {
  performShopTransfer,
  ShopTransferPayload,
  ShopTransferRow,
  ShopTransferLog,
} from "../../firebase/transfers";
import BarcodeScanner from "../../components/common/BarcodeScanner";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */

type ShopName = "Sangli" | "Miraj" | "Kolhapur" | string;

interface TransferRow {
  label: string;
  barcode: string;
  category?: string;
  subcategory?: string;
  location?: string; // MUST HAVE - Location field
  type?: string; // costPriceType (CP-A, CP-B, etc.)
  weight?: string;
  quantity: number;
}

/* ----------------------------------------------------
   CONSTANTS
---------------------------------------------------- */

const DEFAULT_SHOPS: ShopName[] = ["Sangli", "Miraj", "Kolhapur"];

const inputStyle =
  "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

/* ----------------------------------------------------
   COMPONENT
---------------------------------------------------- */

const ShopTransfer: React.FC = () => {
  const [branchStock, setBranchStock] = useState<Record<ShopName, BranchStockItem[]>>({});
  const [loading, setLoading] = useState(false);

  const [fromShop, setFromShop] = useState<ShopName>("");
  const [toShop, setToShop] = useState<ShopName>("");

  const [labelSearch, setLabelSearch] = useState("");
  const [selectedFoundItem, setSelectedFoundItem] = useState<BranchStockItem | null>(null);

  const [transferRows, setTransferRows] = useState<TransferRow[]>([]);
  const [transportBy, setTransportBy] = useState("");
  const [remarks, setRemarks] = useState("");

  // Barcode scanner mode state
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannedQueue, setScannedQueue] = useState<TransferRow[]>([]);

  // Load stock from Firebase when fromShop changes
  useEffect(() => {
    if (!fromShop) return;

    const loadStock = async () => {
      setLoading(true);
      try {
        const stock = await getShopStock(fromShop);
        setBranchStock((prev) => ({ ...prev, [fromShop]: stock }));
      } catch (error) {
        console.error("Error loading stock:", error);
        toast.error("Failed to load stock");
      } finally {
        setLoading(false);
      }
    };

    loadStock();
  }, [fromShop]);

  useEffect(() => {
    setLabelSearch("");
    setSelectedFoundItem(null);
  }, [fromShop]);

  const foundItems = useMemo(() => {
    if (!fromShop) return [];
    const list = branchStock[fromShop] || [];
    const q = labelSearch.toLowerCase();
    if (!q) return list.slice(0, 25);
    return list.filter((it) => it.label.toLowerCase().includes(q));
  }, [labelSearch, fromShop, branchStock]);

  const addSelectedItem = () => {
    if (!selectedFoundItem) {
      toast.error("Select an item first.");
      return;
    }

    // Check if item already added
    const exists = transferRows.find(r => r.label === selectedFoundItem.label);
    if (exists) {
      toast.error("Item already added to transfer list");
      return;
    }

    const row: TransferRow = {
      label: selectedFoundItem.label,
      barcode: selectedFoundItem.barcode,
      category: selectedFoundItem.category,
      subcategory: selectedFoundItem.subcategory,
      location: selectedFoundItem.location || "", // MUST HAVE
      type: selectedFoundItem.costPriceType || selectedFoundItem.type || "",
      weight: String(selectedFoundItem.weight || ""),
      quantity: 1,
    };

    setTransferRows((prev) => [...prev, row]);
    setSelectedFoundItem(null);
    setLabelSearch("");
    toast.success(`Added: ${row.label}`);
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    if (!fromShop) {
      toast.error("Select 'From Shop' first");
      return;
    }

    const stock = branchStock[fromShop] || [];
    const item = stock.find(it => it.barcode === barcode || it.label === barcode);

    if (!item) {
      toast.error(`Item ${barcode} not found in ${fromShop}`);
      return;
    }

    // Check if already added
    const exists = transferRows.find(r => r.barcode === barcode);
    if (exists) {
      toast.error("Item already in transfer list");
      return;
    }

    const row: TransferRow = {
      label: item.label,
      barcode: item.barcode,
      category: item.category,
      subcategory: item.subcategory,
      location: item.location || "", // MUST HAVE
      type: item.costPriceType || item.type || "",
      weight: String(item.weight || ""),
      quantity: 1,
    };

    setTransferRows((prev) => [...prev, row]);
    
    // Add to scanned queue for visual feedback
    setScannedQueue((prev) => [row, ...prev].slice(0, 10)); // Keep last 10
    
    toast.success(`Scanned: ${barcode}`);
  };
  
  // Clear scanned queue
  const clearScannedQueue = () => {
    setScannedQueue([]);
  };

  const addManualRow = () => {
    setTransferRows((prev) => [
      ...prev,
      {
        label: "",
        barcode: "",
        category: "",
        subcategory: "",
        location: "", // MUST HAVE
        type: "",
        weight: "",
        quantity: 1
      },
    ]);
  };

  const updateRow = <K extends keyof TransferRow>(
    index: number,
    field: K,
    value: TransferRow[K]
  ) => {
    setTransferRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeRow = (index: number) => {
    setTransferRows((prev) => prev.filter((_, i) => i !== index));
  };

  const computeTotals = () => {
    let totalQty = transferRows.length; // Count of items, not sum of quantities
    let totalWeight = 0;

    transferRows.forEach((r) => {
      totalWeight += parseFloat(r.weight || "0");
    });

    return { totalQty, totalWeight: totalWeight.toFixed(2) };
  };

  const performTransfer = async () => {
    if (!fromShop || !toShop) {
      toast.error("Select both shops.");
      return;
    }
    if (fromShop === toShop) {
      toast.error("From and To shops cannot be same.");
      return;
    }
    if (!transferRows.length) {
      toast.error("Add transfer items first.");
      return;
    }

    // Validate all rows have labels
    const invalidRows = transferRows.filter((r) => !r.label.trim());
    if (invalidRows.length > 0) {
      toast.error("All items must have a label.");
      return;
    }

    // Confirm transfer
    const confirmMsg = `Transfer ${transferRows.length} items from ${fromShop} to ${toShop}?\n\nThis will:\n- Remove items from ${fromShop}\n- Add items to ${toShop}\n- Generate transfer challan`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Processing transfer...");

    try {
      console.log("Initiating transfer from", fromShop, "to", toShop);

      // Prepare transfer payload
      const payload: ShopTransferPayload = {
        fromShop,
        toShop,
        rows: transferRows.map((r) => ({
          label: r.label,
          barcode: r.barcode,
          category: r.category,
          subcategory: r.subcategory,
          location: r.location,
          type: r.type,
          weight: r.weight,
          quantity: 1, // Always 1 per item
        })),
        transportBy,
        remarks,
        date: new Date().toISOString(),
        totals: computeTotals(),
      };

      console.log("Transfer payload:", payload);

      // Perform transfer via Firebase
      const log = await performShopTransfer(payload);

      console.log("Transfer successful:", log);

      toast.dismiss(loadingToast);
      toast.success(`✅ Transfer ${log.transferNo} completed!`);

      if (log.missingLabels && log.missingLabels.length > 0) {
        toast.error(`⚠️ Missing items: ${log.missingLabels.join(", ")}`, {
          duration: 5000,
        });
      }

      // Open challan window
      openChallanWindow(log);

      // Reset form
      setTransferRows([]);
      setTransportBy("");
      setRemarks("");
      setLabelSearch("");
      setSelectedFoundItem(null);

      // Reload stock
      const updatedStock = await getShopStock(fromShop);
      setBranchStock((prev) => ({ ...prev, [fromShop]: updatedStock }));

      toast.success("Stock updated successfully!");
    } catch (error) {
      console.error("Transfer error:", error);
      toast.dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to perform transfer: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------
     Generate Challan - Use Dedicated Print Route
  ---------------------------------------------------- */
  const openChallanWindow = (log: ShopTransferLog) => {
    // Save challan data to localStorage
    localStorage.setItem("print_challan", JSON.stringify(log));
    
    // Open print page in new tab
    const printUrl = window.location.origin + "/print-challan";
    window.open(printUrl, "_blank");
  };

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */

  const stockStats = useMemo(() => {
    const fromStock = branchStock[fromShop] || [];
    const toStock = branchStock[toShop] || [];
    return {
      fromCount: fromStock.length,
      toCount: toStock.length,
      transferCount: transferRows.length,
    };
  }, [branchStock, fromShop, toShop, transferRows]);

  return (
    <>
      <PageMeta
        title="Shop-to-Shop Transfer"
        description="Transfer stock between branches and generate challans"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🚚 Shop-to-Shop Transfer"
            subtitle="Move stock between branches and auto-update inventory"
          >
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-1">
                    📦 Transfer Process
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    1. Select source and destination shops • 2. Search or scan items • 3. Review transfer list • 4. Execute transfer & print challan
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">From Shop Stock</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockStats.fromCount}</p>
                  </div>
                  <Package className="text-blue-600 dark:text-blue-400" size={32} />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">To Shop Stock</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockStats.toCount}</p>
                  </div>
                  <TrendingUp className="text-green-600 dark:text-green-400" size={32} />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Items to Transfer</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockStats.transferCount}</p>
                  </div>
                  <Download className="text-purple-600 dark:text-purple-400" size={32} />
                </div>
              </div>
            </div>

            {/* Basic Inputs */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  From Shop *
                </label>
                <CustomDropdown
                  options={DEFAULT_SHOPS.map(s => `${s} (${branchStock[s]?.length || 0} items)`)}
                  value={fromShop ? `${fromShop} (${branchStock[fromShop]?.length || 0} items)` : ""}
                  onChange={(val) => setFromShop(val.split(' (')[0])}
                  placeholder="Select Source Shop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  To Shop *
                </label>
                <CustomDropdown
                  options={DEFAULT_SHOPS.filter(s => s !== fromShop).map(s => `${s} (${branchStock[s]?.length || 0} items)`)}
                  value={toShop ? `${toShop} (${branchStock[toShop]?.length || 0} items)` : ""}
                  onChange={(val) => setToShop(val.split(' (')[0])}
                  placeholder="Select Destination Shop"
                  disabled={!fromShop}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Transport / Vehicle
                </label>
                <input
                  className={inputStyle}
                  value={transportBy}
                  onChange={(e) => setTransportBy(e.target.value)}
                  placeholder="Vehicle number or transport details"
                />
              </div>
            </div>

            {/* Barcode Scanner Mode Section */}
            {fromShop && (
              <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4">
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
                              key={`${item.barcode}-${index}`}
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
                      💡 <strong>Quick Tip:</strong> Scan barcodes to quickly add items to transfer queue. 
                      Each scan adds the item with all details from source shop stock.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Search className="inline mr-1" size={14} />
                Search Item by Label
              </label>
              <div className="flex gap-2 mt-2">
                <input
                  className={`${inputStyle} flex-1`}
                  value={labelSearch}
                  placeholder="Type label to search..."
                  onChange={(e) => setLabelSearch(e.target.value)}
                  disabled={!fromShop}
                />
                <button
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() =>
                    selectedFoundItem ? addSelectedItem() : addManualRow()
                  }
                  disabled={!fromShop}
                >
                  <Plus size={16} /> {selectedFoundItem ? "Add Selected" : "Add Manual"}
                </button>
              </div>

              {fromShop && foundItems.length > 0 && labelSearch && (
                <div className="mt-3 max-h-60 overflow-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-white/5 p-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
                    Found {foundItems.length} items
                  </p>
                  {foundItems.map((item, i) => (
                    <div
                      key={i}
                      className={`p-3 cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${selectedFoundItem?.label === item.label
                          ? "ring-2 ring-primary bg-primary/10"
                          : ""
                        }`}
                      onClick={() => setSelectedFoundItem(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.category} • {item.location || "No Loc"} • {item.costPriceType || item.type || "N/A"} • {item.weight}g
                          </div>
                        </div>
                        {selectedFoundItem?.label === item.label && (
                          <div className="text-primary font-semibold text-sm">Selected</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer Rows */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Transfer Items ({transferRows.length})
                </h3>
                {transferRows.length > 0 && (
                  <button
                    onClick={() => setTransferRows([])}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {transferRows.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                  <Package className="mx-auto mb-2 text-gray-400" size={48} />
                  <p className="text-gray-500 dark:text-gray-400">
                    No items added yet. Search or scan items to add them to transfer list.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transferRows.map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-3 p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-white/5 hover:shadow-md transition-shadow"
                    >
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                          #{i + 1}
                        </span>
                      </div>

                      <div className="col-span-3">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Label *</label>
                        <input
                          className={`${inputStyle} mt-1`}
                          value={r.label}
                          placeholder="Item label"
                          onChange={(e) => updateRow(i, "label", e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Category</label>
                        <input
                          className={`${inputStyle} mt-1`}
                          placeholder="Category"
                          value={r.category || ""}
                          onChange={(e) => updateRow(i, "category", e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Location *</label>
                        <input
                          className={`${inputStyle} mt-1`}
                          placeholder="Loct"
                          value={r.location || ""}
                          onChange={(e) => updateRow(i, "location", e.target.value)}
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Type</label>
                        <input
                          className={`${inputStyle} mt-1`}
                          placeholder="CP-A"
                          value={r.type || ""}
                          onChange={(e) => updateRow(i, "type", e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Weight (g)</label>
                        <input
                          className={`${inputStyle} mt-1`}
                          placeholder="0.00"
                          value={r.weight || ""}
                          onChange={(e) => updateRow(i, "weight", e.target.value)}
                        />
                      </div>

                      <div className="col-span-1 flex items-end justify-center">
                        <button
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          onClick={() => removeRow(i)}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-8">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Remarks / Notes
                </label>
                <textarea
                  className={inputStyle}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any remarks or notes about this transfer..."
                  rows={2}
                />
              </div>

              <div className="md:col-span-4">
                <div className="mb-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{computeTotals().totalQty}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{computeTotals().totalWeight} g</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-lg hover:shadow-xl"
                    onClick={performTransfer}
                    disabled={loading || !fromShop || !toShop || transferRows.length === 0}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Download size={18} /> Execute Transfer
                      </>
                    )}
                  </button>

                  <button
                    className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl disabled:opacity-50 font-medium transition-colors"
                    onClick={() =>
                      openChallanWindow({
                        transferNo:
                          "PREVIEW-" + new Date().getTime().toString(),
                        fromShop,
                        toShop,
                        date: new Date().toISOString(),
                        rows: transferRows,
                        totals: computeTotals(),
                        transportBy,
                        remarks,
                        createdAt: new Date().toISOString(),
                        missingLabels: [],
                      })
                    }
                    disabled={loading || transferRows.length === 0}
                    title="Preview Challan"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </div>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
};

export default ShopTransfer;
