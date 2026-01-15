// src/pages/Shops/SalesReturn.tsx - FIXED Sales Return Management
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import toast from "react-hot-toast";
import {
  RotateCcw,
  AlertCircle,
  Save,
  Scan,
} from "lucide-react";
import {
  addWarehouseReturn,
  updateBranchStockStatus,
  getStockItemByBarcode,
} from "../../firebase/salesReturns";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import BarcodeScanner from "../../components/common/BarcodeScanner";

type BranchName = "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";

const BRANCHES: BranchName[] = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

const WAREHOUSE_RETURN_REASONS = [
  "Unsold Stock",
  "Damaged",
  "Quality Issue",
  "Wrong Item",
  "Other",
];

export default function SalesReturn() {
  const [selectedBranch, setSelectedBranch] = useState<BranchName>("Sangli");

  // Warehouse Return States
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [warehouseReasons, setWarehouseReasons] = useState<Record<string, string>>({});
  const [warehouseRemarks, setWarehouseRemarks] = useState<Record<string, string>>({});

  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scannerDisabled, setScannerDisabled] = useState(false); // Disable scanner when typing

  // Barcode scanner mode state
  const [scannerEnabled, setScannerEnabled] = useState(false);

  // Handle Barcode Scan (Warehouse Return)
  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      // Check if already scanned
      if (scannedItems.find(item => item.barcode === barcode)) {
        toast("Item already scanned", { icon: "ℹ️" });
        return;
      }

      // Get stock item from branch
      const stockItem = await getStockItemByBarcode(selectedBranch, barcode);

      if (!stockItem) {
        toast.error(`Item ${barcode} not found in ${selectedBranch} stock`);
        return;
      }

      if (stockItem.status !== "in-branch") {
        toast.error(`Item ${barcode} is not available (status: ${stockItem.status})`);
        return;
      }

      // Add to scanned items (this acts as the queue)
      setScannedItems(prev => [{
        ...stockItem,
        barcode: stockItem.barcode || stockItem.label,
      }, ...prev]); // Add to top of queue

      toast.success(`✅ Added: ${barcode}`);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };
  
  // Clear scanned queue
  const clearScannedQueue = () => {
    setScannedItems([]);
  };

  // Process Warehouse Return
  const handleProcessWarehouseReturn = async () => {
    if (scannedItems.length === 0) {
      toast.error("Scan at least one item to return");
      return;
    }

    // Validate reasons
    for (const item of scannedItems) {
      if (!warehouseReasons[item.barcode]) {
        toast.error("Select return reason for all items");
        return;
      }
    }

    setProcessing(true);
    const loadingToast = toast.loading(`Processing ${scannedItems.length} return(s)...`);

    try {
      const returnId = `WR-${selectedBranch}-${Date.now()}`;

      for (const item of scannedItems) {
        // Add warehouse return record
        await addWarehouseReturn({
          returnId,
          branch: selectedBranch,
          barcode: item.barcode,
          category: item.category,
          subcategory: item.subcategory || "",
          location: item.location || "",
          type: item.costPriceType || item.type || "",
          weight: String(item.weight || ""),
          costPrice: item.costPrice || 0, // Default to 0 if undefined
          returnReason: warehouseReasons[item.barcode],
          remarks: warehouseRemarks[item.barcode] || "",
          returnedBy: "current-user",
          returnDate: new Date().toISOString(),
          status: "pending-warehouse",
        });

        // Update stock status to "returned"
        await updateBranchStockStatus(selectedBranch, item.barcode, "returned");

        // Update warehouse item status
        try {
          const warehouseItemRef = doc(db, "warehouseItems", item.warehouseItemId || item.barcode);
          await updateDoc(warehouseItemRef, {
            status: "returned",
            returnedAt: new Date().toISOString(),
            returnedFrom: selectedBranch,
          });
        } catch (err) {
          console.log("Warehouse item update skipped:", err);
        }
      }

      toast.dismiss(loadingToast);
      toast.success(`✅ ${scannedItems.length} item(s) returned to warehouse`);

      // Reset
      setScannedItems([]);
      setWarehouseReasons({});
      setWarehouseRemarks({});
    } catch (error) {
      console.error("Error processing warehouse return:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to process return");
    } finally {
      setProcessing(false);
    }
  };

  const inputStyle =
    "w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta title="Shop to Warehouse Return" description="Handle shop-to-warehouse returns" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🔄 Shop to Warehouse Return"
            subtitle="Process shop-to-warehouse returns"
          >
            {/* Info Banner */}
            <div className="mb-6 p-4 rounded-xl border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-purple-600 dark:text-purple-400" size={20} />
                <div>
                  <h3 className="font-semibold mb-1 text-purple-800 dark:text-purple-400">
                    📋 Warehouse Return Process
                  </h3>
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    Scan barcodes → Specify reason → Process return. Items will be sent to warehouse.
                  </p>
                </div>
              </div>
            </div>

            {/* Branch Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Branch *
              </label>
              <CustomDropdown
                options={BRANCHES}
                value={selectedBranch}
                onChange={(val) => setSelectedBranch(val as BranchName)}
                placeholder="Select Branch"
                disabled={scannedItems.length > 0}
              />
            </div>

            {/* WAREHOUSE RETURN SECTION */}
            <>
              {/* Barcode Scanner Mode Section */}
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
                        placeholder="Scan barcode to add item for warehouse return..."
                        disabled={scannerDisabled}
                      />
                      
                      <div className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 rounded p-2">
                        💡 <strong>Quick Tip:</strong> Scan barcodes to quickly add items for warehouse return. 
                        Items will appear in the queue below with reason and remarks fields.
                      </div>
                    </div>
                  )}
                </div>

                {/* Scanned Items */}
                {scannedItems.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        📋 Recently Scanned ({scannedItems.length})
                      </h3>
                      <button
                        onClick={clearScannedQueue}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-white/10">
                          <tr className="text-left">
                            <th className="p-3">Item</th>
                            <th className="p-3">Barcode</th>
                            <th className="p-3">Location</th>
                            <th className="p-3">Reason *</th>
                            <th className="p-3">Remarks</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {scannedItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200 dark:border-gray-800">
                              <td className="p-3">
                                <div>
                                  <p className="font-semibold">{item.category}</p>
                                  <p className="text-xs text-gray-500">{item.subcategory}</p>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-xs">{item.barcode}</td>
                              <td className="p-3">{item.location}</td>
                              <td className="p-3">
                                <select
                                  value={warehouseReasons[item.barcode] || ""}
                                  onChange={(e) => setWarehouseReasons({ ...warehouseReasons, [item.barcode]: e.target.value })}
                                  onFocus={() => setScannerDisabled(true)}
                                  onBlur={() => setScannerDisabled(false)}
                                  className={inputStyle}
                                >
                                  <option value="">Select reason</option>
                                  {WAREHOUSE_RETURN_REASONS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={warehouseRemarks[item.barcode] || ""}
                                  onChange={(e) => setWarehouseRemarks({ ...warehouseRemarks, [item.barcode]: e.target.value })}
                                  onFocus={() => setScannerDisabled(true)}
                                  onBlur={() => setScannerDisabled(false)}
                                  placeholder="Optional"
                                  className={inputStyle}
                                />
                              </td>
                              <td className="p-3">
                                <button
                                  onClick={() => setScannedItems(scannedItems.filter((_, i) => i !== idx))}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleProcessWarehouseReturn}
                        disabled={processing}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save size={18} />
                        Process Return ({scannedItems.length})
                      </button>
                    </div>
                  </>
                )}
              </>

            {/* Empty State */}
            {scannedItems.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <RotateCcw size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">
                  Scan barcodes to start processing warehouse returns
                </p>
              </div>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
