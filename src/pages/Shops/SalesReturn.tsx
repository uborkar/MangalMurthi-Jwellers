// src/pages/Shops/SalesReturn.tsx - FIXED Sales Return Management
import { useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  Search,
  RotateCcw,
  AlertCircle,
  ArrowLeft,
  Save,
  Truck,
  Scan,
} from "lucide-react";
import {
  getInvoiceById,
  addCustomerReturn,
  addWarehouseReturn,
  updateBranchStockStatus,
  getStockItemByBarcode,
  InvoiceData,
  CustomerReturnItem,
  WarehouseReturnItem,
} from "../../firebase/salesReturns";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import BarcodeScanner from "../../components/common/BarcodeScanner";

type BranchName = "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";
type ReturnType = "customer-to-shop" | "shop-to-warehouse";

const BRANCHES: BranchName[] = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

const CUSTOMER_RETURN_REASONS = [
  "Defective",
  "Wrong Item",
  "Customer Changed Mind",
  "Size Issue",
  "Quality Issue",
  "Other",
];

const WAREHOUSE_RETURN_REASONS = [
  "Unsold Stock",
  "Damaged",
  "Quality Issue",
  "Wrong Item",
  "Other",
];

export default function SalesReturn() {
  const [returnType, setReturnType] = useState<ReturnType>("customer-to-shop");
  const [selectedBranch, setSelectedBranch] = useState<BranchName>("Sangli");
  
  // Customer Return States
  const [invoiceId, setInvoiceId] = useState("");
  const [invoice, setInvoice] = useState<(InvoiceData & { id: string}) | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [returnRemarks, setReturnRemarks] = useState<Record<string, string>>({});
  
  // Warehouse Return States
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [warehouseReasons, setWarehouseReasons] = useState<Record<string, string>>({});
  const [warehouseRemarks, setWarehouseRemarks] = useState<Record<string, string>>({});
  
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scannerDisabled, setScannerDisabled] = useState(false); // Disable scanner when typing

  // Search Invoice (Customer Return)
  const handleSearchInvoice = async () => {
    if (!invoiceId.trim()) {
      toast.error("Enter invoice ID");
      return;
    }

    setSearching(true);
    try {
      const foundInvoice = await getInvoiceById(selectedBranch, invoiceId.trim());
      
      if (!foundInvoice) {
        toast.error(`Invoice ${invoiceId} not found in ${selectedBranch}`);
        setInvoice(null);
        return;
      }

      setInvoice(foundInvoice);
      setSelectedItems(new Set());
      setReturnReasons({});
      setReturnRemarks({});
      toast.success(`Found invoice with ${foundInvoice.items.length} items`);
    } catch (error) {
      console.error("Error searching invoice:", error);
      toast.error("Failed to search invoice");
    } finally {
      setSearching(false);
    }
  };

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

      // Add to scanned items
      setScannedItems(prev => [...prev, {
        ...stockItem,
        barcode: stockItem.barcode || stockItem.label,
      }]);
      
      toast.success(`✅ Added: ${barcode}`);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Process Customer Return
  const handleProcessCustomerReturn = async () => {
    if (selectedItems.size === 0) {
      toast.error("Select at least one item to return");
      return;
    }

    // Validate reasons
    for (const barcode of selectedItems) {
      if (!returnReasons[barcode]) {
        toast.error("Select return reason for all items");
        return;
      }
    }

    setProcessing(true);
    const loadingToast = toast.loading(`Processing ${selectedItems.size} return(s)...`);

    try {
      const returnId = `CR-${selectedBranch}-${Date.now()}`;

      for (const barcode of selectedItems) {
        const item = invoice!.items.find(i => i.barcode === barcode);
        if (!item) continue;

        // Add customer return record
        await addCustomerReturn(selectedBranch, {
          returnId,
          invoiceId: invoice!.id,
          branch: selectedBranch,
          barcode: item.barcode,
          category: item.category,
          subcategory: item.subcategory,
          location: item.location,
          type: item.type,
          weight: item.weight,
          sellingPrice: item.sellingPrice,
          discount: item.discount || 0,
          taxableAmount: item.taxableAmount,
          returnReason: returnReasons[barcode],
          remarks: returnRemarks[barcode] || "",
          returnedBy: "current-user", // TODO: Get from auth
          returnDate: new Date().toISOString(),
          status: "returned-to-shop",
        });

        // Update stock status back to "in-branch"
        await updateBranchStockStatus(selectedBranch, barcode, "in-branch");
      }

      toast.dismiss(loadingToast);
      toast.success(`✅ ${selectedItems.size} item(s) returned to shop inventory`);
      
      // Reset
      setInvoice(null);
      setInvoiceId("");
      setSelectedItems(new Set());
      setReturnReasons({});
      setReturnRemarks({});
    } catch (error) {
      console.error("Error processing customer return:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to process return");
    } finally {
      setProcessing(false);
    }
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
      <PageMeta title="Sales Return Management" description="Handle customer returns and shop-to-warehouse returns" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🔄 Sales Return Management"
            subtitle="Process customer returns and shop-to-warehouse returns"
          >
            {/* Return Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => {
                  setReturnType("customer-to-shop");
                  setInvoice(null);
                  setScannedItems([]);
                }}
                className={`p-6 rounded-xl border-2 transition-all ${
                  returnType === "customer-to-shop"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <ArrowLeft
                    className={returnType === "customer-to-shop" ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}
                    size={24}
                  />
                  <h3 className={`font-bold text-lg ${returnType === "customer-to-shop" ? "text-blue-900 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
                    Customer Return
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customer returns sold items. Items go back to shop inventory.
                </p>
              </button>

              <button
                onClick={() => {
                  setReturnType("shop-to-warehouse");
                  setInvoice(null);
                  setScannedItems([]);
                }}
                className={`p-6 rounded-xl border-2 transition-all ${
                  returnType === "shop-to-warehouse"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Truck
                    className={returnType === "shop-to-warehouse" ? "text-purple-600 dark:text-purple-400" : "text-gray-400"}
                    size={24}
                  />
                  <h3 className={`font-bold text-lg ${returnType === "shop-to-warehouse" ? "text-purple-900 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>
                    Shop to Warehouse
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Shop returns unsold/damaged items to warehouse.
                </p>
              </button>
            </div>

            {/* Info Banner */}
            <div className={`mb-6 p-4 rounded-xl border ${
                returnType === "customer-to-shop"
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
              }`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={returnType === "customer-to-shop" ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"} size={20} />
                <div>
                  <h3 className={`font-semibold mb-1 ${returnType === "customer-to-shop" ? "text-blue-800 dark:text-blue-400" : "text-purple-800 dark:text-purple-400"}`}>
                    {returnType === "customer-to-shop" ? "📋 Customer Return Process" : "📋 Warehouse Return Process"}
                  </h3>
                  <p className={`text-sm ${returnType === "customer-to-shop" ? "text-blue-800 dark:text-blue-300" : "text-purple-800 dark:text-purple-300"}`}>
                    {returnType === "customer-to-shop"
                      ? "Search invoice → Select items → Specify reason → Process return. Items will be marked as 'in-branch'."
                      : "Scan barcodes → Specify reason → Process return. Items will be sent to warehouse."}
                  </p>
                </div>
              </div>
            </div>

            {/* Branch Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Branch *
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as BranchName)}
                className={inputStyle}
                disabled={!!invoice || scannedItems.length > 0}
              >
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {/* CUSTOMER RETURN SECTION */}
            {returnType === "customer-to-shop" && (
              <>
                {/* Invoice Search */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Invoice ID *
                    </label>
                    <input
                      type="text"
                      value={invoiceId}
                      onChange={(e) => setInvoiceId(e.target.value)}
                      placeholder="Enter invoice ID..."
                      className={inputStyle}
                      disabled={!!invoice}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSearchInvoice}
                      disabled={searching || !!invoice}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Search size={18} />
                      Search Invoice
                    </button>
                  </div>
                </div>

                {/* Invoice Items */}
                {invoice && (
                  <>
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-green-800 dark:text-green-400">✅ Invoice Found</h3>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Customer: <strong>{invoice.customerName || "N/A"}</strong> • 
                            Total: <strong>₹{invoice.totals.grandTotal.toLocaleString()}</strong>
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setInvoice(null);
                            setInvoiceId("");
                            setSelectedItems(new Set());
                          }}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-white/10">
                          <tr className="text-left">
                            <th className="p-3">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems(new Set(invoice.items.map(i => i.barcode)));
                                  } else {
                                    setSelectedItems(new Set());
                                  }
                                }}
                                checked={selectedItems.size === invoice.items.length}
                              />
                            </th>
                            <th className="p-3">Item</th>
                            <th className="p-3">Barcode</th>
                            <th className="p-3">Price</th>
                            <th className="p-3">Reason *</th>
                            <th className="p-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item) => (
                            <tr key={item.barcode} className="border-b border-gray-200 dark:border-gray-800">
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.has(item.barcode)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedItems);
                                    if (e.target.checked) {
                                      newSet.add(item.barcode);
                                    } else {
                                      newSet.delete(item.barcode);
                                    }
                                    setSelectedItems(newSet);
                                  }}
                                />
                              </td>
                              <td className="p-3">
                                <div>
                                  <p className="font-semibold">{item.category}</p>
                                  <p className="text-xs text-gray-500">{item.subcategory}</p>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-xs">{item.barcode}</td>
                              <td className="p-3">₹{item.sellingPrice.toLocaleString()}</td>
                              <td className="p-3">
                                <select
                                  value={returnReasons[item.barcode] || ""}
                                  onChange={(e) => setReturnReasons({...returnReasons, [item.barcode]: e.target.value})}
                                  className={inputStyle}
                                  disabled={!selectedItems.has(item.barcode)}
                                >
                                  <option value="">Select reason</option>
                                  {CUSTOMER_RETURN_REASONS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={returnRemarks[item.barcode] || ""}
                                  onChange={(e) => setReturnRemarks({...returnRemarks, [item.barcode]: e.target.value})}
                                  placeholder="Optional"
                                  className={inputStyle}
                                  disabled={!selectedItems.has(item.barcode)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleProcessCustomerReturn}
                        disabled={processing || selectedItems.size === 0}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save size={18} />
                        Process Return ({selectedItems.size})
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* WAREHOUSE RETURN SECTION */}
            {returnType === "shop-to-warehouse" && (
              <>
                {/* Barcode Scanner */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    <Scan className="inline mr-1" size={16} />
                    Scan Item Barcode
                  </label>
                  <BarcodeScanner
                    onScan={handleBarcodeScan}
                    placeholder="Scan barcode to add item for warehouse return..."
                    disabled={scannerDisabled}
                  />
                </div>

                {/* Scanned Items */}
                {scannedItems.length > 0 && (
                  <>
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
                                  onChange={(e) => setWarehouseReasons({...warehouseReasons, [item.barcode]: e.target.value})}
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
                                  onChange={(e) => setWarehouseRemarks({...warehouseRemarks, [item.barcode]: e.target.value})}
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
            )}

            {/* Empty State */}
            {!invoice && scannedItems.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <RotateCcw size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">
                  {returnType === "customer-to-shop"
                    ? "Search for an invoice to start processing customer returns"
                    : "Scan barcodes to start processing warehouse returns"}
                </p>
              </div>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
