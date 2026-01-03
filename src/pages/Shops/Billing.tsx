// src/pages/Shops/Billing.tsx - Simplified Billing with Barcode Scanner
import { useEffect, useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Trash2, Download, Printer, ShoppingCart, Eye } from "lucide-react";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import { getItemByBarcode, markItemSold } from "../../firebase/warehouseItems";
import BarcodeScanner from "../../components/common/BarcodeScanner";
import InvoicePreview from "../../components/common/InvoicePreview";
import { doc, updateDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useShop } from "../../context/ShopContext";
import { createSaleLedgerEntry } from "../../firebase/ledger";
import { getGSTSettings, GSTSettings, calculateGST, getAppSettings } from "../../firebase/settings";

import { numberToWords } from "../../utils/numberToWords";

type BranchName = "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";

interface BillItem {
  id: string;
  barcode: string;
  category: string;
  subcategory?: string;
  location: string; // Location (Loct)
  type: string; // costPriceType (CP-A, CP-B, etc.)
  weight: string;
  costPrice: number;
  sellingPrice: number;
  discount: number; // Manual discount
  taxableAmount: number;
  shopStockId?: string;
  warehouseItemId?: string;
}

const BRANCHES: BranchName[] = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

export default function Billing() {
  const { branchStockCache, setBranchStockCache, currentBill, updateBill, clearBill } = useShop();
  
  const [selectedBranch, setSelectedBranch] = useState<BranchName>(currentBill.branch);
  const [customerName, setCustomerName] = useState(currentBill.customerName);
  const [customerPhone, setCustomerPhone] = useState(currentBill.customerPhone);
  const [salespersonName, setSalespersonName] = useState(currentBill.salespersonName);
  const [billItems, setBillItems] = useState<BillItem[]>(currentBill.items);
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>(branchStockCache[selectedBranch] || []);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [savedInvoiceData, setSavedInvoiceData] = useState<any>(null);
  
  // GST Settings
  const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null);
  const [gstType, setGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Load GST settings and company info
  useEffect(() => {
    loadGSTSettings();
    loadCompanySettings();
  }, []);

  const loadGSTSettings = async () => {
    try {
      const settings = await getGSTSettings();
      if (settings && settings.defaultType) {
        setGstSettings(settings);
        setGstType(settings.defaultType);
      } else {
        // Set default values if settings don't exist
        const defaultSettings: GSTSettings = {
          defaultType: "cgst_sgst",
          cgst: 1.5,
          sgst: 1.5,
          igst: 3,
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
        };
        setGstSettings(defaultSettings);
        setGstType(defaultSettings.defaultType);
      }
    } catch (error) {
      console.error("Error loading GST settings:", error);
      // Set default values on error
      const defaultSettings: GSTSettings = {
        defaultType: "cgst_sgst",
        cgst: 1.5,
        sgst: 1.5,
        igst: 3,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      };
      setGstSettings(defaultSettings);
      setGstType(defaultSettings.defaultType);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const settings = await getAppSettings();
      setCompanySettings(settings);
    } catch (error) {
      console.error("Error loading company settings:", error);
    }
  };

  // Sync with context whenever bill items change (with debounce to avoid too many updates)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        updateBill({
          branch: selectedBranch,
          items: billItems,
          customerName,
          customerPhone,
          salespersonName,
        });
      } catch (error) {
        console.error("Error updating bill context:", error);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [billItems, selectedBranch, customerName, customerPhone, salespersonName]);

  // Load branch stock (with caching)
  useEffect(() => {
    loadBranchStock();
  }, [selectedBranch]);

  const loadBranchStock = async () => {
    // Check cache first (only for available items)
    if (branchStockCache[selectedBranch] && branchStockCache[selectedBranch].length > 0) {
      const available = branchStockCache[selectedBranch].filter((s) => s.status === "in-branch" || !s.status);
      setBranchStock(available);
      console.log(`✅ Loaded ${available.length} available items from cache for ${selectedBranch}`);
      return;
    }

    // Load from Firebase
    setLoading(true);
    try {
      const stock = await getShopStock(selectedBranch);
      
      // Cache ALL items (including sold)
      setBranchStockCache(selectedBranch, stock);
      
      // But only show available items in billing
      const available = stock.filter((s) => s.status === "in-branch" || !s.status);
      setBranchStock(available);
      
      toast.success(`Loaded ${available.length} available items from ${selectedBranch}`);
    } catch (error) {
      console.error("Error loading stock:", error);
      toast.error("Failed to load branch stock");
    } finally {
      setLoading(false);
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    // Prevent empty scans
    if (!barcode || !barcode.trim()) {
      return;
    }

    const trimmedBarcode = barcode.trim();

    try {
      // Check if already in bill
      if (billItems.find((i) => i.barcode === trimmedBarcode)) {
        toast.error(`Item ${trimmedBarcode} already in bill`);
        return;
      }

      // Find in branch stock (check both barcode and label)
      const stockItem = branchStock.find(
        (s) => s.barcode === trimmedBarcode || s.label === trimmedBarcode
      );

      if (!stockItem) {
        toast.error(`Item ${trimmedBarcode} not found in ${selectedBranch} stock`);
        return;
      }

      if (stockItem.status !== "in-branch") {
        toast.error(`Item ${trimmedBarcode} is not available (status: ${stockItem.status})`);
        return;
      }

      // Get warehouse item for details (optional, use stock item if not found)
      let warehouseItem = null;
      try {
        warehouseItem = await getItemByBarcode(trimmedBarcode);
      } catch (err) {
        console.log("Warehouse item not found, using stock item data");
      }

      // Add to bill (no quantity - each scan = 1 item)
      const newItem: BillItem = {
        id: crypto.randomUUID(),
        barcode: trimmedBarcode,
        category: stockItem.category || warehouseItem?.category || "Unknown",
        subcategory: stockItem.subcategory || warehouseItem?.subcategory,
        location: stockItem.location || warehouseItem?.location || "-",
        type: stockItem.costPriceType || warehouseItem?.costPriceType || "-",
        weight: String(stockItem.weight || warehouseItem?.weight || "0"),
        costPrice: stockItem.costPrice || warehouseItem?.costPrice || 0,
        sellingPrice: stockItem.costPrice || warehouseItem?.costPrice || 0, // Can be edited
        discount: 0, // Manual discount
        taxableAmount: 0,
        shopStockId: stockItem.id,
        warehouseItemId: warehouseItem?.id,
      };

      // Calculate taxable amount
      const calculated = calculateItemTaxable(newItem);
      setBillItems((prev) => [...prev, calculated]);
      toast.success(`✅ Added: ${stockItem.category} (${trimmedBarcode})`);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Calculate taxable amount for an item (with discount)
  const calculateItemTaxable = (item: BillItem): BillItem => {
    const taxable = item.sellingPrice - item.discount; // Selling price minus discount
    return {
      ...item,
      taxableAmount: Math.max(taxable, 0),
    };
  };

  // Update item field
  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setBillItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return calculateItemTaxable(updated);
      })
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setBillItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculate totals with dynamic GST
  const totals = {
    subtotal: billItems.reduce((sum, item) => sum + item.sellingPrice, 0),
    totalDiscount: billItems.reduce((sum, item) => sum + item.discount, 0),
    taxable: billItems.reduce((sum, item) => sum + item.taxableAmount, 0),
    gst: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    grandTotal: 0,
  };

  // Calculate GST based on type and settings
  if (gstSettings) {
    const gstCalc = calculateGST(totals.taxable, gstType, gstSettings);
    totals.cgst = gstCalc.cgst;
    totals.sgst = gstCalc.sgst;
    totals.igst = gstCalc.igst;
    totals.gst = gstCalc.totalGST;
  }

  totals.grandTotal = totals.taxable + totals.gst;

  // Save invoice
  const handleSaveInvoice = async () => {
    console.log("🔵 Save Invoice clicked");
    
    if (billItems.length === 0) {
      toast.error("Add at least one item to the bill");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Enter customer name");
      return;
    }

    if (!salespersonName.trim()) {
      toast.error("Enter salesperson name");
      return;
    }

    console.log("🔵 Validation passed, saving invoice...");
    const loadingToast = toast.loading("Saving invoice...");

    try {
      const invoiceId = `INV-${selectedBranch}-${Date.now()}`;
      console.log("🔵 Invoice ID:", invoiceId);

      // Mark items as sold in warehouse
      console.log("🔵 Marking items as sold...");
      for (const item of billItems) {
        if (item.warehouseItemId) {
          await markItemSold(item.warehouseItemId, invoiceId);
          console.log("✅ Marked warehouse item as sold:", item.warehouseItemId);
        }

        // Update shop stock status
        if (item.shopStockId) {
          const shopStockRef = doc(
            db,
            "shops",
            selectedBranch,
            "stockItems",
            item.shopStockId
          );
          await updateDoc(shopStockRef, {
            status: "sold",
            soldAt: new Date().toISOString(),
            soldInvoiceId: invoiceId,
          });
          console.log("✅ Updated shop stock status:", item.shopStockId);
        }
      }

      // Save invoice to Firestore
      console.log("🔵 Saving invoice to Firestore...");
      const invoiceRef = doc(db, "shops", selectedBranch, "invoices", invoiceId);
      
      // Prepare invoice data (ensure no undefined values)
      const invoiceData = {
        invoiceId,
        branch: selectedBranch,
        customerName,
        customerPhone: customerPhone || "",
        salespersonName,
        items: billItems.map((item) => ({
          barcode: item.barcode,
          category: item.category,
          subcategory: item.subcategory || "",
          location: item.location || "",
          type: item.type || "",
          weight: item.weight || "",
          costPrice: item.costPrice || 0,
          sellingPrice: item.sellingPrice || 0,
          discount: item.discount || 0,
          taxableAmount: item.taxableAmount || 0,
        })),
        totals: {
          subtotal: totals.subtotal || 0,
          totalDiscount: totals.totalDiscount || 0,
          taxable: totals.taxable || 0,
          cgst: totals.cgst || 0,
          sgst: totals.sgst || 0,
          igst: totals.igst || 0,
          gst: totals.gst || 0,
          grandTotal: totals.grandTotal || 0,
        },
        gstType: gstType || "cgst_sgst",
        gstSettings: {
          cgst: gstSettings?.cgst || 1.5,
          sgst: gstSettings?.sgst || 1.5,
          igst: gstSettings?.igst || 3,
        },
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(invoiceRef, invoiceData);

      console.log("✅ Invoice saved successfully!");
      toast.dismiss(loadingToast);
      toast.success("✅ Invoice saved successfully!");

      // Create ledger entry for sale
      try {
        await createSaleLedgerEntry(
          selectedBranch,
          invoiceId,
          customerName,
          customerPhone,
          totals.grandTotal,
          salespersonName,
          "current-user" // TODO: Get from auth
        );
        console.log("✅ Ledger entry created for sale");
      } catch (ledgerError) {
        console.error("Error creating ledger entry:", ledgerError);
        // Don't fail the sale if ledger fails
      }

      // Save invoice data for preview
      setSavedInvoiceData({
        ...invoiceData,
        totals,
        gstType,
        companySettings,
      });

      // Show preview modal
      setShowPreview(true);

    } catch (error) {
      console.error("❌ Error saving invoice:", error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to save invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Handle print from preview
  const handlePrintInvoice = () => {
    setShowPreview(false);
    setTimeout(() => {
      window.print();
      
      // Ask if user wants to clear after print
      setTimeout(() => {
        const shouldClear = window.confirm(
          "Do you want to clear the bill and start a new one?"
        );

        if (shouldClear) {
          // Clear cache to force fresh load
          setBranchStockCache(selectedBranch, []);
          clearBill();
          setBillItems([]);
          setCustomerName("");
          setCustomerPhone("");
          setSalespersonName("");
          loadBranchStock();
        }
      }, 500);
    }, 100);
  };

  // Close preview without printing
  const handleClosePreview = () => {
    setShowPreview(false);
    
    const shouldClear = window.confirm(
      "Do you want to clear the bill and start a new one?"
    );

    if (shouldClear) {
      setBranchStockCache(selectedBranch, []);
      clearBill();
      setBillItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setSalespersonName("");
      loadBranchStock();
    }
  };

  // Load last invoice
  const loadLastInvoice = async () => {
    try {
      const invoicesRef = collection(db, "shops", selectedBranch, "invoices");
      const q = query(invoicesRef, orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setLastInvoice(snap.docs[0].data());
        setShowHistory(true);
        toast.success("Last invoice loaded");
      } else {
        toast("No previous invoices found");
      }
    } catch (error) {
      console.error("Error loading last invoice:", error);
      toast.error("Failed to load invoice history");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (billItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const data = billItems.map((item, idx) => ({
      "Sr No": idx + 1,
      "Item Name": item.category,
      "Barcode": item.barcode,
      "Lot": "-",
      "Pcs": 1,
      "Weight": item.weight,
      "Type": item.type,
      "Rate": item.sellingPrice,
      "Taxable Value": item.taxableAmount,
    }));

    // Add totals
    data.push({
      "Sr No": "",
      "Item Name": "",
      "Barcode": "",
      "Lot": "",
      "Pcs": billItems.length,
      "Weight": "",
      "Type": "",
      "Rate": "TOTAL",
      "Taxable Value": totals.taxable,
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    XLSX.writeFile(workbook, `Invoice_${selectedBranch}_${Date.now()}.xlsx`);
    toast.success("Excel exported");
  };

  // Export to PDF
  const exportToPDF = () => {
    if (billItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("SALES INVOICE", 105, 15, { align: "center" });

    doc.setFontSize(11);
    doc.text(`Branch: ${selectedBranch}`, 14, 25);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Customer: ${customerName}`, 14, 39);
    if (customerPhone) doc.text(`Phone: ${customerPhone}`, 14, 46);
    doc.text(`Salesperson: ${salespersonName}`, 14, customerPhone ? 53 : 46);

    // Table
    const tableData = billItems.map((item, idx) => [
      idx + 1,
      item.category,
      item.barcode,
      "-", // Lot
      1, // Pcs
      item.weight,
      item.type,
      `₹${item.sellingPrice}`,
      `₹${item.taxableAmount}`,
    ]);

    autoTable(doc, {
      startY: customerPhone ? 60 : 53,
      head: [["#", "Item", "Barcode", "Lot", "Pcs", "Wt", "Type", "Rate", "Taxable"]],
      body: tableData,
      theme: "grid",
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Subtotal: ₹${totals.subtotal.toFixed(2)}`, 140, finalY);
    doc.text(`Taxable: ₹${totals.taxable.toFixed(2)}`, 140, finalY + 7);
    doc.text(`CGST (1.5%): ₹${totals.cgst.toFixed(2)}`, 140, finalY + 21);
    doc.text(`SGST (1.5%): ₹${totals.sgst.toFixed(2)}`, 140, finalY + 21);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ₹${totals.grandTotal.toFixed(2)}`, 140, finalY + 31);

    doc.save(`Invoice_${selectedBranch}_${Date.now()}.pdf`);
    toast.success("PDF exported");
  };

  return (
    <>
      <PageMeta title="Billing - POS" description="Point of Sale billing system" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection title="🧾 Point of Sale - Billing" subtitle="Scan items and generate invoices">
            {/* Branch & Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchName)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  Salesperson Name *
                </label>
                <input
                  type="text"
                  value={salespersonName}
                  onChange={(e) => setSalespersonName(e.target.value)}
                  placeholder="Enter salesperson name"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={loadLastInvoice}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <ShoppingCart size={16} /> Last Bill
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Excel
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download size={16} /> PDF
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Printer size={16} /> Print
              </button>
              {billItems.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to clear the current bill?")) {
                      setBillItems([]);
                      setCustomerName("");
                      setCustomerPhone("");
                      setSalespersonName("");
                      clearBill();
                      await loadBranchStock();
                      toast.success("Bill cleared");
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} /> Clear Bill
                </button>
              )}
            </div>

            {/* Barcode Scanner */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                🔍 Scan Item Barcode
              </label>
              <BarcodeScanner
                onScan={handleBarcodeScan}
                placeholder="Scan barcode to add item to bill..."
                disabled={loading}
              />
            </div>

            {/* Bill Items Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                    <th className="p-3">Sr No</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Barcode</th>
                    <th className="p-3">Loct</th>
                    <th className="p-3">Pcs</th>
                    <th className="p-3">Weight</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Taxable Value</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3 font-medium">{item.category}</td>
                      <td className="p-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {item.barcode}
                      </td>
                      <td className="p-3 text-gray-500">{item.location}</td>
                      <td className="p-3">1</td>
                      <td className="p-3">{item.weight}</td>
                      <td className="p-3">{item.type}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) =>
                            updateItem(item.id, "sellingPrice", Number(e.target.value))
                          }
                          className="w-24 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
                          min="0"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(item.id, "discount", Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
                          min="0"
                          max={item.sellingPrice}
                        />
                      </td>
                      <td className="p-3 font-semibold">₹{item.taxableAmount.toFixed(2)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {billItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-gray-500">
                        <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No items in bill. Scan barcodes to add items.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            {billItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div></div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                  {/* GST Type Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                      GST Type
                    </label>
                    <select
                      value={gstType}
                      onChange={(e) => setGstType(e.target.value as "cgst_sgst" | "igst")}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                    >
                      <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                      <option value="igst">IGST (Inter-state)</option>
                    </select>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Total Discount:</span>
                      <span className="font-semibold">-₹{totals.totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxable Amount:</span>
                      <span className="font-semibold">₹{totals.taxable.toFixed(2)}</span>
                    </div>
                    
                    {gstType === "cgst_sgst" ? (
                      <>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>CGST ({gstSettings?.cgst || 1.5}%):</span>
                          <span>₹{totals.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>SGST ({gstSettings?.sgst || 1.5}%):</span>
                          <span>₹{totals.sgst.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>IGST ({gstSettings?.igst || 3}%):</span>
                        <span>₹{totals.igst.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-300 dark:border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Grand Total:</span>
                        <span className="text-green-600 dark:text-green-400">
                          ₹{totals.grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveInvoice}
                    className="w-full mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={billItems.length === 0 || !customerName.trim() || !salespersonName.trim()}
                    type="button"
                  >
                    {billItems.length === 0 
                      ? "Add items to bill" 
                      : !customerName.trim() 
                      ? "Enter customer name" 
                      : !salespersonName.trim()
                      ? "Enter salesperson name"
                      : "Save Invoice & Complete Sale"}
                  </button>
                </div>
              </div>
            )}

            {/* Last Invoice History */}
            {showHistory && lastInvoice && (
              <div className="mt-6 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300">
                    📜 Last Invoice
                  </h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Invoice ID:</span>
                    <p className="font-semibold">{lastInvoice.invoiceId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                    <p className="font-semibold">{lastInvoice.customerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Salesperson:</span>
                    <p className="font-semibold">{lastInvoice.salespersonName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <p className="font-semibold">
                      {new Date(lastInvoice.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-purple-200 dark:border-purple-800">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-100 dark:bg-purple-900/40">
                      <tr className="text-left">
                        <th className="p-2">#</th>
                        <th className="p-2">Item</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Barcode</th>
                        <th className="p-2">Weight</th>
                        <th className="p-2">Rate</th>
                        <th className="p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastInvoice.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-purple-200 dark:border-purple-800">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{item.category}</td>
                          <td className="p-2">{item.type}</td>
                          <td className="p-2 font-mono text-xs">{item.barcode}</td>
                          <td className="p-2">{item.weight}</td>
                          <td className="p-2">₹{item.sellingPrice}</td>
                          <td className="p-2 font-semibold">₹{item.taxableAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-right">
                  <p className="text-lg font-bold text-purple-900 dark:text-purple-300">
                    Grand Total: ₹{lastInvoice.totals?.grandTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </TASection>
        </div>
      </div>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-invoice, .print-invoice * {
            visibility: visible;
          }
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          
          /* Professional invoice styling */
          .print-invoice {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          
          .print-header h1 {
            font-size: 20px;
            font-weight: bold;
            margin: 0 0 5px 0;
          }
          
          .print-header p {
            margin: 2px 0;
            font-size: 11px;
          }
          
          .print-section {
            margin-bottom: 15px;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
            font-size: 11px;
          }
          
          .print-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .print-table td.text-right {
            text-align: right;
          }
          
          .print-totals {
            margin-top: 10px;
            float: right;
            width: 300px;
          }
          
          .print-totals table {
            width: 100%;
          }
          
          .print-totals td {
            padding: 3px 5px;
            border: none;
          }
          
          .print-totals .total-row {
            border-top: 2px solid #000;
            font-weight: bold;
            font-size: 13px;
          }
          
          .print-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #000;
          }
          
          .print-signature {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
          }
          
          .print-signature div {
            text-align: center;
            width: 200px;
          }
        }
      `}</style>

      {/* Print-Ready Invoice (Hidden on screen, visible on print) - EXACT FORMAT FROM IMAGE */}
      {billItems.length > 0 && (
        <div className="print-invoice" style={{ display: "none" }}>
          {/* Top Header - Company Info from Settings */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "10px" }}>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 5px 0", textTransform: "uppercase" }}>
              {companySettings?.companyName || "JEWELRY STORE"}
            </h1>
            <p style={{ margin: "2px 0", fontSize: "10px" }}>
              {companySettings?.companyAddress || "Store Address"}
            </p>
            <p style={{ margin: "2px 0", fontSize: "10px" }}>
              Phone: {companySettings?.companyPhone || "Phone Number"}
            </p>
            <p style={{ margin: "2px 0", fontSize: "10px", fontWeight: "bold" }}>
              GSTIN: {companySettings?.companyGSTIN || "GSTIN Number"}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "11px", fontWeight: "bold" }}>
              Sales Book - 1 <span style={{ float: "right" }}>ORIGINAL</span>
            </p>
          </div>

          {/* Bill Details Row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "10px" }}>
            <div>
              <p style={{ margin: "2px 0" }}><strong>Bill No:</strong> {Date.now().toString().slice(-6)}</p>
              <p style={{ margin: "2px 0" }}><strong>Bill Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "2px 0" }}><strong>Shop:</strong> {selectedBranch}</p>
            </div>
          </div>

          {/* Party & Staff Details */}
          <div style={{ marginBottom: "10px", fontSize: "10px", border: "1px solid #000", padding: "5px" }}>
            <p style={{ margin: "2px 0" }}><strong>Party Name:</strong> {customerName}</p>
            <p style={{ margin: "2px 0" }}><strong>Mo:</strong> {customerPhone || "N/A"}</p>
            <p style={{ margin: "2px 0" }}><strong>Emp Name:</strong> {salespersonName}</p>
          </div>

          {/* Items Table - EXACT FORMAT FROM IMAGE */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", marginBottom: "10px" }}>
            <thead>
              <tr style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                <th style={{ padding: "3px", textAlign: "left", width: "25px" }}>SNO</th>
                <th style={{ padding: "3px", textAlign: "left" }}>Item Name</th>
                <th style={{ padding: "3px", textAlign: "center", width: "70px" }}>HSN Code</th>
                <th style={{ padding: "3px", textAlign: "left", width: "60px" }}>Remark</th>
                <th style={{ padding: "3px", textAlign: "center", width: "35px" }}>Loct</th>
                <th style={{ padding: "3px", textAlign: "center", width: "30px" }}>Pcs</th>
                <th style={{ padding: "3px", textAlign: "right", width: "50px" }}>Weight</th>
                <th style={{ padding: "3px", textAlign: "center", width: "40px" }}>Type</th>
                <th style={{ padding: "3px", textAlign: "right", width: "60px" }}>Rate</th>
                <th style={{ padding: "3px", textAlign: "right", width: "50px" }}>Disc</th>
                <th style={{ padding: "3px", textAlign: "right", width: "70px" }}>Taxable</th>
              </tr>
            </thead>
            <tbody>
              {billItems.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "3px" }}>{idx + 1}</td>
                  <td style={{ padding: "3px" }}>{item.category}</td>
                  <td style={{ padding: "3px", textAlign: "center" }}>7103</td>
                  <td style={{ padding: "3px" }}>{item.subcategory || "-"}</td>
                  <td style={{ padding: "3px", textAlign: "center" }}>{item.location}</td>
                  <td style={{ padding: "3px", textAlign: "center" }}>1</td>
                  <td style={{ padding: "3px", textAlign: "right" }}>{item.weight}</td>
                  <td style={{ padding: "3px", textAlign: "center" }}>{item.type}</td>
                  <td style={{ padding: "3px", textAlign: "right" }}>{item.sellingPrice.toFixed(2)}</td>
                  <td style={{ padding: "3px", textAlign: "right" }}>{item.discount.toFixed(2)}</td>
                  <td style={{ padding: "3px", textAlign: "right" }}>{item.taxableAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom Section - GST Summary & Payment */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
            {/* Left Side - Amount in Words */}
            <div style={{ width: "60%", paddingRight: "10px" }}>
              <p style={{ margin: "5px 0", fontWeight: "bold" }}>
                Rupees: {numberToWords(totals.grandTotal)}
              </p>
              <div style={{ marginTop: "30px", fontSize: "8px" }}>
                <p style={{ margin: "2px 0" }}><strong>GST No:</strong> {companySettings?.companyGSTIN || "GSTIN"}</p>
                <p style={{ margin: "2px 0" }}><strong>State:</strong> Maharashtra</p>
              </div>
            </div>

            {/* Right Side - Totals */}
            <div style={{ width: "40%", border: "1px solid #000" }}>
              <table style={{ width: "100%", fontSize: "9px" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "3px" }}>Net Amount:</td>
                    <td style={{ padding: "3px", textAlign: "right" }}>{totals.taxable.toFixed(2)}</td>
                  </tr>
                  {gstType === "cgst_sgst" ? (
                    <>
                      <tr style={{ borderBottom: "1px solid #ddd" }}>
                        <td style={{ padding: "3px" }}>CGST {gstSettings?.cgst || 1.5}%:</td>
                        <td style={{ padding: "3px", textAlign: "right" }}>{totals.cgst.toFixed(2)}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #ddd" }}>
                        <td style={{ padding: "3px" }}>SGST {gstSettings?.sgst || 1.5}%:</td>
                        <td style={{ padding: "3px", textAlign: "right" }}>{totals.sgst.toFixed(2)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "3px" }}>IGST {gstSettings?.igst || 3}%:</td>
                      <td style={{ padding: "3px", textAlign: "right" }}>{totals.igst.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "3px", fontWeight: "bold" }}>Bill Amount:</td>
                    <td style={{ padding: "3px", textAlign: "right", fontWeight: "bold" }}>{totals.grandTotal.toFixed(2)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "3px" }}>Cash Received:</td>
                    <td style={{ padding: "3px", textAlign: "right" }}>{totals.grandTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px" }}>Outstanding:</td>
                    <td style={{ padding: "3px", textAlign: "right" }}>0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer - Signature */}
          <div style={{ marginTop: "40px", textAlign: "right", fontSize: "10px" }}>
            <p style={{ margin: "0" }}>For {companySettings?.companyName || "JEWELRY STORE"}</p>
            <div style={{ marginTop: "30px", borderTop: "1px solid #000", width: "150px", marginLeft: "auto" }}>
              <p style={{ margin: "5px 0 0 0" }}>Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .print-invoice, .print-invoice * {
            visibility: visible;
          }
          
          .print-invoice {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 15mm;
          }
          
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </>
  );
}
