// src/pages/Shops/Billing.tsx - Simplified Billing with Barcode Scanner
import { useEffect, useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Trash2, Download, Printer, ShoppingCart, Eye, Scan, RotateCcw, ArrowLeft, Search } from "lucide-react";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import { getItemByBarcode, markItemSold } from "../../firebase/warehouseItems";
import BarcodeScanner from "../../components/common/BarcodeScanner";
import InvoicePreview from "../../components/common/InvoicePreview";
import { doc, updateDoc, setDoc, collection, query, orderBy, limit, getDocs, where, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useShop } from "../../context/ShopContext";
import { createSaleLedgerEntry } from "../../firebase/ledger";
import { getGSTSettings, GSTSettings, calculateGST, getAppSettings } from "../../firebase/settings";
import {
  createSalesReturnBill,
  updateInvoiceWithReturn,
  updateStockAfterReturn,
  updateReturnBillWithExchange,
  calculateReturnAmounts,
  generateReturnId,
  canReturnItem,
  SalesReturnBill,
  ReturnedItem,
} from "../../firebase/salesReturnBill";

import { numberToWords } from "../../utils/numberToWords";
import { createPrintHTML, printDocument } from "../../utils/printUtils";
import CustomDropdown from "../../components/common/CustomDropdown";
import { getAllActiveSalespersons, addSalesperson, deleteSalesperson, Salesperson } from "../../firebase/salespersons";

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

const RETURN_REASONS = [
  "Defective",
  "Wrong Item",
  "Customer Changed Mind",
  "Size Issue",
  "Quality Issue",
  "Design Not Liked",
  "Exchange for Different Design",
  "Other",
];

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

  // Dynamic Salespersons State - managed locally like branches in Distribution
  const [salespersons, setSalespersons] = useState<string[]>([]);

  // Barcode scanner mode state
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannedQueue, setScannedQueue] = useState<BillItem[]>([]);

  // Bill Mode: 'new-bill' or 'return-bill'
  const [billMode, setBillMode] = useState<'new-bill' | 'return-bill'>('new-bill');

  // Return Bill States
  const [searchInvoiceId, setSearchInvoiceId] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [originalInvoice, setOriginalInvoice] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [selectedReturnItems, setSelectedReturnItems] = useState<Set<string>>(new Set());
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [returnRemarks, setReturnRemarks] = useState<Record<string, string>>({});
  const [returnCalculation, setReturnCalculation] = useState<any>(null);
  const [settlementMode, setSettlementMode] = useState<'exchange' | 'refund' | 'store-credit'>('exchange');
  const [availableCredit, setAvailableCredit] = useState(0);
  const [processingReturn, setProcessingReturn] = useState(false);
  const [searchingInvoice, setSearchingInvoice] = useState(false);

  // GST Settings
  const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null);
  const [gstType, setGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Load GST settings and company info
  useEffect(() => {
    loadGSTSettings();
    loadCompanySettings();
    loadSalespersons();
    restoreExchangeSession();
  }, []);

  // Restore exchange credit and customer info from sessionStorage
  const restoreExchangeSession = () => {
    try {
      const savedExchangeData = sessionStorage.getItem('exchangeCredit');
      if (savedExchangeData) {
        const data = JSON.parse(savedExchangeData);
        // Check if credit is still valid (within 24 hours)
        const savedTime = new Date(data.timestamp).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

        if (hoursDiff < 24 && data.branch === selectedBranch) {
          setAvailableCredit(data.credit);
          setCustomerName(data.customerName || '');
          setCustomerPhone(data.customerPhone || '');
          toast.success(`Exchange credit restored: ₹${data.credit.toFixed(2)}`);
        } else {
          // Clear expired or different branch credit
          sessionStorage.removeItem('exchangeCredit');
        }
      }
    } catch (error) {
      console.error('Error restoring exchange session:', error);
      sessionStorage.removeItem('exchangeCredit');
    }
  };

  // Save exchange credit to sessionStorage
  const saveExchangeSession = (credit: number, customerName: string, customerPhone: string, returnId?: string) => {
    try {
      const exchangeData = {
        credit,
        customerName,
        customerPhone,
        returnId,  // Track which return generated this credit
        branch: selectedBranch,
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem('exchangeCredit', JSON.stringify(exchangeData));
    } catch (error) {
      console.error('Error saving exchange session:', error);
    }
  };

  // Clear exchange credit from sessionStorage
  const clearExchangeSession = () => {
    try {
      sessionStorage.removeItem('exchangeCredit');
    } catch (error) {
      console.error('Error clearing exchange session:', error);
    }
  };

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

  // Load salespersons from Firebase - filtered by current branch
  const loadSalespersons = async () => {
    try {
      const allSp = await getAllActiveSalespersons();
      // Filter by current branch
      const branchSp = allSp.filter(sp => sp.primaryBranch === selectedBranch);
      setSalespersons(branchSp.map(s => s.name).sort());
    } catch (error) {
      console.error("Error loading salespersons:", error);
      setSalespersons([]);
    }
  };

  // Reload salespersons when branch changes
  useEffect(() => {
    loadSalespersons();
  }, [selectedBranch]);

  // Handler for adding new salesperson
  const handleAddSalesperson = async (name: string) => {
    if (!salespersons.includes(name)) {
      // Add to local state immediately
      setSalespersons(prev => [...prev, name].sort());
      setSalespersonName(name);
      toast.success(`Added salesperson: ${name}`);

      // Save to Firebase in background
      try {
        await addSalesperson(name, selectedBranch);
      } catch (error) {
        console.error("Error saving salesperson to Firebase:", error);
      }
    }
  };

  // Handler for deleting salesperson
  const handleDeleteSalesperson = async (name: string) => {
    // Remove from local state immediately
    setSalespersons(prev => prev.filter(sp => sp !== name));
    if (salespersonName === name) {
      setSalespersonName("");
    }
    toast.success(`Deleted salesperson: ${name}`);

    // Delete from Firebase in background
    try {
      const allSp = await getAllActiveSalespersons();
      const spToDelete = allSp.find(sp => sp.name === name && sp.primaryBranch === selectedBranch);
      if (spToDelete) {
        await deleteSalesperson(spToDelete.id, name);
      }
    } catch (error) {
      console.error("Error deleting salesperson from Firebase:", error);
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

      toast.success(`Loaded ${available.length} available items from ${selectedBranch}`, {
        id: `load-stock-${selectedBranch}`,
      });
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

      // Add to scanned queue for visual feedback
      setScannedQueue((prev) => [calculated, ...prev].slice(0, 10)); // Keep last 10

      toast.success(`✅ Added: ${stockItem.category} (${trimmedBarcode})`);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Clear scanned queue
  const clearScannedQueue = () => {
    setScannedQueue([]);
  };

  // ============================================
  // RETURN BILL FUNCTIONS
  // ============================================

  // Load recent invoices for return
  const loadRecentInvoices = async () => {
    try {
      const invoicesRef = collection(db, "shops", selectedBranch, "invoices");
      const q = query(invoicesRef, orderBy("createdAt", "desc"), limit(20));
      const snapshot = await getDocs(q);

      const invoices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRecentInvoices(invoices);
    } catch (error) {
      console.error("Error loading recent invoices:", error);
      toast.error("Failed to load recent invoices");
    }
  };

  // Search invoice by ID or phone
  const searchInvoice = async () => {
    if (!searchInvoiceId.trim() && !searchPhone.trim()) {
      toast.error("Enter invoice ID or phone number");
      return;
    }

    setSearchingInvoice(true);
    try {
      const invoicesRef = collection(db, "shops", selectedBranch, "invoices");
      let q;

      if (searchInvoiceId.trim()) {
        // Search by invoice ID
        const invoiceDocRef = doc(db, "shops", selectedBranch, "invoices", searchInvoiceId.trim());
        const snapshot = await getDoc(invoiceDocRef);

        if (snapshot.exists()) {
          setOriginalInvoice({ id: snapshot.id, ...snapshot.data() });
          setSelectedReturnItems(new Set());
          setReturnReasons({});
          setReturnRemarks({});
          toast.success("Invoice loaded");
        } else {
          toast.error("Invoice not found");
        }
      } else if (searchPhone.trim()) {
        // Search by phone
        q = query(
          invoicesRef,
          where("customerPhone", "==", searchPhone.trim()),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const invoices = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRecentInvoices(invoices);
          toast.success(`Found ${invoices.length} invoice(s)`);
        } else {
          toast.error("No invoices found for this phone number");
        }
      }
    } catch (error) {
      console.error("Error searching invoice:", error);
      toast.error("Failed to search invoice");
    } finally {
      setSearchingInvoice(false);
    }
  };

  // Select invoice from recent list
  const selectInvoiceForReturn = (invoice: any) => {
    setOriginalInvoice(invoice);
    setSelectedReturnItems(new Set());
    setReturnReasons({});
    setReturnRemarks({});
    setRecentInvoices([]);
  };

  // Toggle return item selection
  const toggleReturnItem = (barcode: string) => {
    setSelectedReturnItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(barcode)) {
        newSet.delete(barcode);
        // Remove reason and remarks
        const { [barcode]: _, ...restReasons } = returnReasons;
        const { [barcode]: __, ...restRemarks } = returnRemarks;
        setReturnReasons(restReasons);
        setReturnRemarks(restRemarks);
      } else {
        newSet.add(barcode);
      }
      return newSet;
    });
  };

  // Calculate return amounts
  const calculateReturn = () => {
    if (!originalInvoice || selectedReturnItems.size === 0) {
      return null;
    }

    const selectedItems = originalInvoice.items.filter((item: any) =>
      selectedReturnItems.has(item.barcode)
    );

    const calc = calculateReturnAmounts(
      selectedItems.map((item: any) => ({ originalPrice: item.sellingPrice })),
      gstType,
      gstSettings?.cgst || 1.5,
      gstSettings?.sgst || 1.5,
      gstSettings?.igst || 3
    );

    setReturnCalculation(calc);
    return calc;
  };

  // Process return bill
  const processReturnBill = async () => {
    if (!originalInvoice) {
      toast.error("No invoice selected");
      return;
    }

    if (selectedReturnItems.size === 0) {
      toast.error("Select at least one item to return");
      return;
    }

    // Validate reasons
    for (const barcode of selectedReturnItems) {
      if (!returnReasons[barcode]) {
        toast.error("Please provide return reason for all items");
        return;
      }
    }

    setProcessingReturn(true);
    const loadingToast = toast.loading("Processing return...");

    try {
      const returnId = generateReturnId(selectedBranch);
      const calc = calculateReturn();

      if (!calc) {
        throw new Error("Failed to calculate return");
      }

      // Prepare returned items
      const returnedItems: ReturnedItem[] = originalInvoice.items
        .filter((item: any) => selectedReturnItems.has(item.barcode))
        .map((item: any) => ({
          barcode: item.barcode,
          category: item.category,
          subcategory: item.subcategory || "",
          location: item.location || "",
          type: item.type || "",
          weight: item.weight || "",
          originalPrice: item.sellingPrice,
          originalDiscount: item.discount || 0,
          returnRate: 50,
          returnAmount: item.sellingPrice * 0.5,
          returnReason: returnReasons[item.barcode],
          remarks: returnRemarks[item.barcode] || "",
          stockStatus: "returned-to-inventory",
        }));

      // Create return bill record (only include defined fields)
      const returnBill: Omit<SalesReturnBill, "id" | "createdAt"> = {
        returnId,
        originalInvoiceId: originalInvoice.id || originalInvoice.invoiceId,
        branch: selectedBranch,
        customerName: originalInvoice.customerName || "",
        customerPhone: originalInvoice.customerPhone || "",
        returnDate: new Date().toISOString(),
        processedBy: salespersonName || "Unknown",
        returnedItems,
        calculations: {
          totalOriginalValue: calc.totalOriginalValue,
          totalReturnValue: calc.totalReturnValue,
          returnRate: 50,
          cgst: calc.cgst,
          sgst: calc.sgst,
          igst: calc.igst,
          totalCreditAmount: calc.totalCreditAmount,
        },
        settlementType: settlementMode,
        status: settlementMode === "exchange" ? "pending" : "completed",
      };

      // Save return bill
      await createSalesReturnBill(selectedBranch, returnBill);

      // Update original invoice
      await updateInvoiceWithReturn(
        selectedBranch,
        originalInvoice.id || originalInvoice.invoiceId,
        returnId,
        Array.from(selectedReturnItems)
      );

      // Update stock for returned items
      for (const barcode of selectedReturnItems) {
        await updateStockAfterReturn(selectedBranch, barcode, "in-branch");
      }

      toast.dismiss(loadingToast);

      if (settlementMode === "exchange") {
        // Set credit and switch to new bill mode
        const creditAmount = calc.totalCreditAmount;
        const custName = originalInvoice.customerName || "";
        const custPhone = originalInvoice.customerPhone || "";

        setAvailableCredit(creditAmount);
        setCustomerName(custName);
        setCustomerPhone(custPhone);

        // Save to sessionStorage for persistence across navigation (with returnId)
        saveExchangeSession(creditAmount, custName, custPhone, returnId);

        setBillMode("new-bill");
        setOriginalInvoice(null);
        setSelectedReturnItems(new Set());
        setReturnReasons({});
        setReturnRemarks({});
        await loadBranchStock(); // Reload stock
        toast.success(`Return processed! Credit: ₹${creditAmount.toFixed(2)}. Add items for exchange.`);
      } else {
        toast.success(`Return processed successfully! Refund: ₹${calc.totalCreditAmount.toFixed(2)}`);
        // Reset return bill
        setOriginalInvoice(null);
        setSelectedReturnItems(new Set());
        setReturnReasons({});
        setReturnRemarks({});
        setBillMode("new-bill");
      }
    } catch (error) {
      console.error("Error processing return:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to process return");
    } finally {
      setProcessingReturn(false);
    }
  };

  // Cancel return and go back
  const cancelReturn = () => {
    setOriginalInvoice(null);
    setSelectedReturnItems(new Set());
    setReturnReasons({});
    setReturnRemarks({});
    setReturnCalculation(null);
    setSearchInvoiceId("");
    setSearchPhone("");
    setRecentInvoices([]);
    setBillMode("new-bill");
  };

  // Load recent invoices when entering return mode
  useEffect(() => {
    if (billMode === "return-bill") {
      loadRecentInvoices();
    }
  }, [billMode, selectedBranch]);

  // Recalculate return when items change
  useEffect(() => {
    if (originalInvoice && selectedReturnItems.size > 0) {
      calculateReturn();
    }
  }, [selectedReturnItems, originalInvoice]);

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
    creditAdjustment: availableCredit, // Credit from return
    finalAmount: 0, // After credit adjustment
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
  totals.finalAmount = totals.grandTotal - totals.creditAdjustment;

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
          creditAdjustment: availableCredit || 0,
          finalAmount: totals.finalAmount || totals.grandTotal || 0,
        },
        isExchangeBill: availableCredit > 0,
        // Only include exchangeCredit field if there's actual credit
        ...(availableCredit > 0 && { exchangeCredit: availableCredit }),
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

      // Link exchange invoice back to return bill if this is an exchange
      if (availableCredit > 0) {
        try {
          // Get returnId from session storage
          const exchangeSession = sessionStorage.getItem('exchangeCredit');
          if (exchangeSession) {
            const { returnId: originalReturnId } = JSON.parse(exchangeSession);
            if (originalReturnId) {
              await updateReturnBillWithExchange(
                selectedBranch,
                originalReturnId,
                invoiceId,
                totals.grandTotal,
                availableCredit,
                totals.finalAmount
              );
              console.log('✅ Return bill linked to exchange invoice');
            }
          }
        } catch (linkError) {
          console.error('Error linking exchange invoice to return:', linkError);
          // Don't fail the sale if linking fails
        }
        clearExchangeSession();
      }

    } catch (error) {
      console.error("❌ Error saving invoice:", error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to save invoice: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Handle print from preview
  const handlePrintInvoice = () => {
    setShowPreview(false);

    // Generate invoice ID
    const invoiceId = `INV-${Date.now().toString().slice(-8)}`;

    // Create printable HTML
    const printHTML = createPrintHTML({
      title: `Invoice ${invoiceId}`,
      styles: `
        body {
          font-family: 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          color: #000;
        }

        .invoice-header {
          text-align: center;
          padding-bottom: 8px;
          margin-bottom: 0;
        }
        
        .invoice-header h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 4px 0;
          text-transform: none;
        }
        
        .invoice-header p {
          margin: 2px 0;
          font-size: 11px;
          color: #333;
        }
        
        .top-meta {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          margin-top: 10px;
          margin-bottom: 12px;
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 8px 0;
        }

        .sales-book-title {
          font-weight: bold;
          font-size: 14px;
        }

        .original-tag {
          position: absolute;
          right: 0;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 11px;
        }
        
        .bill-info-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 12px;
        }

        .bill-info-left {
          width: 50%;
        }

        .bill-info-right {
          width: 50%;
          text-align: right;
        }

        .bill-info-right p {
          margin: 2px 0;
        }
        
        .party-box {
          border: 1px solid #000;
          padding: 10px 15px;
          margin-bottom: 15px;
          font-size: 12px;
          min-height: 70px;
        }
        
        .party-box p {
          margin: 5px 0;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 15px;
        }
        
        .items-table th {
          border: 1px solid #000;
          background-color: #f2f2f2;
          padding: 8px 4px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
        }
        
        .items-table td {
          border: 1px solid #000;
          padding: 6px 4px;
          height: 24px;
        }
        
        .totals-container {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-top: 10px;
        }
        
        .totals-left {
          width: 55%;
        }
        
        .totals-right {
          width: 42%;
          border: 1px solid #000;
        }
        
        .totals-right table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .totals-right td {
          padding: 5px 10px;
          border-bottom: 1px solid #eee;
        }

        .totals-right tr:last-child td {
          border-bottom: none;
        }
        
        .total-row {
          font-weight: bold;
          background-color: #f9f9f9;
          border-top: 1.5px solid #000;
        }
        
        .signature-area {
          margin-top: 50px;
          text-align: right;
          font-size: 11px;
        }
        
        .sig-line {
          margin-top: 45px;
          border-top: 1px solid #000;
          width: 220px;
          display: inline-block;
          text-align: center;
          padding-top: 6px;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      `,
      bodyContent: `
        <!-- Header -->
        <div class="invoice-header">
          <h1>${companySettings?.companyName || "Mangal-Murthi Jewelry Store"}</h1>
          <p>${companySettings?.companyAddress || "Sangli Road, Miraj, Maharashtra"}</p>
          <p>Web: ${companySettings?.companyWebsite || "www.mangalmurthijewellers.com"} | Ph: ${companySettings?.companyPhone || "9270494338"}</p>
          <p><strong>GSTIN: ${companySettings?.companyGSTIN || "27AANCS1421M1Z3"}</strong></p>
        </div>
        
        <!-- Sales Book Title -->
        <div class="top-meta">
          <span class="sales-book-title">Sales Book - 1</span>
          <span class="original-tag">ORIGINAL</span>
        </div>

        <!-- Bill Details Row -->
        <div class="bill-info-container">
          <div class="bill-info-left">
            <p><strong>Location:</strong> ${selectedBranch}</p>
          </div>
          <div class="bill-info-right">
            <p><strong>Bill Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
            <p><strong>Bill No:</strong> ${invoiceId}</p>
          </div>
        </div>
        
        <!-- Party Details Box -->
        <div class="party-box">
          <p><strong>Party Name:</strong> ${customerName || "Walk-in Customer"}</p>
          <p><strong>Mo:</strong> ${customerPhone || "N/A"}</p>
          <p><strong>Emp Name:</strong> ${salespersonName || "N/A"}</p>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40px;">SNO</th>
              <th>ITEM NAME</th>
              <th style="width: 70px;">HSN</th>
              <th style="width: 90px;">REMARK</th>
              <th style="width: 60px;">LOCT</th>
              <th style="width: 40px;">PCS</th>
              <th style="width: 70px;">WT</th>
              <th style="width: 60px;">TYPE</th>
              <th style="width: 90px;">RATE</th>
              <th style="width: 70px;">DISC</th>
              <th style="width: 100px;">TAXABLE</th>
            </tr>
          </thead>
          <tbody>
            ${billItems.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${item.category}</td>
                <td class="text-center">7103</td>
                <td>${item.subcategory || "-"}</td>
                <td class="text-center">${item.location}</td>
                <td class="text-center">1</td>
                <td class="text-right">${item.weight}</td>
                <td class="text-center">${item.type}</td>
                <td class="text-right">${item.sellingPrice.toFixed(2)}</td>
                <td class="text-right">${item.discount.toFixed(2)}</td>
                <td class="text-right font-bold">${item.taxableAmount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <!-- Fill empty rows to maintain height -->
            ${Array(Math.max(0, 8 - billItems.length)).fill(0).map(() => `
              <tr>
                <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Totals Section -->
        <div class="totals-container">
          <!-- Left Side -->
          <div class="totals-left">
            <p style="margin-bottom: 25px; font-weight: bold;">Rupees: ${numberToWords(totals.finalAmount || totals.grandTotal)}</p>
            <div style="font-size: 10px; line-height: 1.8;">
              <p><strong>GST No:</strong> ${companySettings?.companyGSTIN || "27AANCS1421M1Z3"}</p>
              <p><strong>State:</strong> Maharashtra</p>
            </div>
          </div>
          
          <!-- Right Side -->
          <div class="totals-right">
            <table>
              <tr>
                <td>Net Amount:</td>
                <td class="text-right">${totals.taxable.toFixed(2)}</td>
              </tr>
              ${gstType === "cgst_sgst" ? `
                <tr>
                  <td>SGST ${gstSettings?.sgst || 1.5}%:</td>
                  <td class="text-right">${totals.sgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>CGST ${gstSettings?.cgst || 1.5}%:</td>
                  <td class="text-right">${totals.cgst.toFixed(2)}</td>
                </tr>
              ` : `
                <tr>
                  <td>IGST ${gstSettings?.igst || 3}%:</td>
                  <td class="text-right">${totals.igst.toFixed(2)}</td>
                </tr>
              `}
              <tr class="total-row">
                <td><strong>Bill Amount:</strong></td>
                <td class="text-right"><strong>${totals.grandTotal.toFixed(2)}</strong></td>
              </tr>
              ${availableCredit > 0 ? `
                <tr>
                  <td>Exchange Credit:</td>
                  <td class="text-right">-${availableCredit.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Final Amount:</strong></td>
                  <td class="text-right"><strong>${totals.finalAmount.toFixed(2)}</strong></td>
                </tr>
              ` : ''}
              <tr>
                <td>Cash Received:</td>
                <td class="text-right">${(totals.finalAmount || totals.grandTotal).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Outstanding:</td>
                <td class="text-right">0.00</td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Footer / Signature -->
        <div class="signature-area">
          <p>For: ${companySettings?.companyName || "Mangal-Murthi Jewelry Store"}</p>
          <div class="sig-line">Authorized Signatory</div>
        </div>
      `
    });

    // Print the document
    printDocument(printHTML);

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
        setAvailableCredit(0);
        clearExchangeSession();
        loadBranchStock();
      }
    }, 1000);
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

    const workbook = XLSX.utils.book_new();

    // Invoice Details Sheet
    const invoiceDetails = [
      { Field: "Invoice Information", Value: "" },
      { Field: "Branch", Value: selectedBranch },
      { Field: "Invoice Date", Value: new Date().toLocaleDateString() },
      {},
      { Field: "Customer Details", Value: "" },
      { Field: "Customer Name", Value: customerName || "-" },
      { Field: "Mobile No", Value: customerPhone || "-" },
      { Field: "Salesperson", Value: salespersonName || "-" },
      {},
      { Field: "Financial Summary", Value: "" },
      { Field: "Subtotal", Value: `₹${totals.subtotal.toFixed(2)}` },
      { Field: "Total Discount", Value: `₹${totals.totalDiscount.toFixed(2)}` },
      { Field: "Taxable Amount", Value: `₹${totals.taxable.toFixed(2)}` },
      { Field: "CGST", Value: `₹${totals.cgst.toFixed(2)}` },
      { Field: "SGST", Value: `₹${totals.sgst.toFixed(2)}` },
      { Field: "Total GST", Value: `₹${totals.gst.toFixed(2)}` },
      { Field: "Grand Total", Value: `₹${totals.grandTotal.toFixed(2)}` },
      {},
      { Field: "Generated By", Value: "Mangal-Murthi Jewelry Store" },
    ];
    const detailsSheet = XLSX.utils.json_to_sheet(invoiceDetails);
    XLSX.utils.book_append_sheet(workbook, detailsSheet, "Invoice Details");

    // Items Sheet - Alphabetically ordered columns
    const itemsData = billItems.map((item, idx) => ({
      "Sr No": idx + 1,
      "Barcode": item.barcode,
      "Category": item.category,
      "Discount (₹)": (item.discount || 0).toFixed(2),
      "HSN": "7103",
      "Location": item.location || "-",
      "Pieces": 1,
      "Rate (₹)": item.sellingPrice.toFixed(2),
      "Remark": item.subcategory || "-",
      "Taxable Amount (₹)": item.taxableAmount.toFixed(2),
      "Type": item.type || "-",
      "Weight (gm)": item.weight,
    }));

    // Add totals row
    itemsData.push({
      "Sr No": "",
      "Barcode": "",
      "Category": "",
      "Discount (₹)": totals.totalDiscount.toFixed(2),
      "HSN": "",
      "Location": "",
      "Pieces": billItems.length,
      "Rate (₹)": "",
      "Remark": "TOTAL",
      "Taxable Amount (₹)": totals.taxable.toFixed(2),
      "Type": "",
      "Weight (gm)": "",
    } as any);

    const itemsSheet = XLSX.utils.json_to_sheet(itemsData);

    // Set column widths
    itemsSheet['!cols'] = [
      { wch: 6 },  // Sr No
      { wch: 15 }, // Barcode
      { wch: 20 }, // Category
      { wch: 12 }, // Discount
      { wch: 8 },  // HSN
      { wch: 12 }, // Location
      { wch: 8 },  // Pieces
      { wch: 12 }, // Rate
      { wch: 20 }, // Remark
      { wch: 15 }, // Taxable Amount
      { wch: 10 }, // Type
      { wch: 12 }, // Weight
    ];

    XLSX.utils.book_append_sheet(workbook, itemsSheet, "Items");

    // Generate filename
    const filename = `Invoice_${selectedBranch}_${customerName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success("Excel exported successfully!");
  };

  // Export to PDF
  const exportToPDF = () => {
    if (billItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const invoiceId = `INV-${Date.now().toString().slice(-8)}`;
    const compName = companySettings?.companyName || "Mangal-Murthi Jewelry Store";

    // Header - Centered
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(compName, pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(companySettings?.companyAddress || "Sangli Road, Miraj, Maharashtra", pageWidth / 2, 20, { align: "center" });
    doc.text(`Web: ${companySettings?.companyWebsite || "www.mangalmurthijewellers.com"} | Ph: ${companySettings?.companyPhone || "9270494338"}`, pageWidth / 2, 24, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${companySettings?.companyGSTIN || "27AANCS1421M1Z3"}`, pageWidth / 2, 28, { align: "center" });

    doc.line(10, 32, pageWidth - 10, 32);

    // Sub-header centered
    doc.setFontSize(11);
    doc.text("Sales Book - 1", pageWidth / 2, 38, { align: "center" });
    doc.setFontSize(9);
    doc.text("ORIGINAL", pageWidth - 15, 38, { align: "right" });

    doc.line(10, 42, pageWidth - 10, 42);

    // Branch & Meta
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Location: ${selectedBranch}`, 14, 48);
    doc.text(`Bill Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, 48, { align: "right" });
    doc.text(`Bill No: ${invoiceId}`, pageWidth - 14, 53, { align: "right" });

    // Party Details Box
    doc.setDrawColor(0);
    doc.rect(14, 58, pageWidth - 28, 20);
    doc.text(`Party Name: ${customerName || "Walk-in Customer"}`, 18, 63);
    doc.text(`Mo: ${customerPhone || "N/A"}`, 18, 68);
    doc.text(`Emp Name: ${salespersonName || "N/A"}`, 18, 73);

    // Table
    const tableData = billItems.map((item, idx) => [
      idx + 1,
      item.category,
      "7103",
      item.subcategory || "-",
      item.location,
      1,
      item.weight,
      item.type,
      item.sellingPrice.toFixed(2),
      item.discount.toFixed(2),
      item.taxableAmount.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 82,
      head: [["SNO", "ITEM NAME", "HSN", "REMARK", "LOCT", "PCS", "WT", "TYPE", "RATE", "DISC", "TAXABLE"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 10 },
        6: { halign: 'right', cellWidth: 15 },
        7: { halign: 'center', cellWidth: 15 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 15 },
        10: { halign: 'right', cellWidth: 20 },
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Rupees: ${numberToWords(totals.finalAmount || totals.grandTotal)}`, 14, finalY);

    // Small footer left
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`GST No: ${companySettings?.companyGSTIN || "27AANCS1421M1Z3"}`, 14, finalY + 15);
    doc.text(`State: Maharashtra`, 14, finalY + 20);

    // Totals Box Right
    const totalsX = pageWidth - 80;
    doc.rect(totalsX, finalY - 5, 66, availableCredit > 0 ? 55 : 45);

    let currentY = finalY;
    doc.setFontSize(9);
    doc.text(`Net Amount:`, totalsX + 2, currentY);
    doc.text(`${totals.taxable.toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });

    currentY += 6;
    if (gstType === "cgst_sgst") {
      doc.text(`SGST ${gstSettings?.sgst || 1.5}%:`, totalsX + 2, currentY);
      doc.text(`${totals.sgst.toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });
      currentY += 6;
      doc.text(`CGST ${gstSettings?.cgst || 1.5}%:`, totalsX + 2, currentY);
      doc.text(`${totals.cgst.toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });
    } else {
      doc.text(`IGST ${gstSettings?.igst || 3}%:`, totalsX + 2, currentY);
      doc.text(`${totals.igst.toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });
    }

    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Bill Amount:`, totalsX + 2, currentY);
    doc.text(`${totals.grandTotal.toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });

    if (availableCredit > 0) {
      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Exchange Credit:`, totalsX + 2, currentY);
      doc.text(`-${availableCredit.toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });
      currentY += 8;
      doc.setFont("helvetica", "bold");
      doc.text(`Final Amount:`, totalsX + 2, currentY);
      doc.text(`${totals.finalAmount.toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });
    }

    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Cash Received:`, totalsX + 2, currentY);
    doc.text(`${(totals.finalAmount || totals.grandTotal).toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });

    currentY += 6;
    doc.text(`Outstanding:`, totalsX + 2, currentY);
    doc.text(`0.00`, pageWidth - 16, currentY, { align: "right" });

    // Signature
    doc.setFontSize(9);
    doc.text(`For: ${compName}`, pageWidth - 14, currentY + 20, { align: "right" });
    doc.line(pageWidth - 60, currentY + 35, pageWidth - 14, currentY + 35);
    doc.text(`Authorized Signatory`, pageWidth - 37, currentY + 40, { align: "center" });

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
                  Salesperson *
                </label>
                <CustomDropdown
                  options={salespersons}
                  value={salespersonName}
                  onChange={(val) => setSalespersonName(val)}
                  onAddNew={handleAddSalesperson}
                  onDelete={handleDeleteSalesperson}
                  placeholder="Select salesperson"
                  addNewPlaceholder="Add salesperson..."
                  allowDelete={true}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              {/* Mode Toggle: New Bill / Return Bill */}
              <button
                onClick={() => {
                  if (billMode === 'new-bill') {
                    setBillMode('return-bill');
                    setAvailableCredit(0);
                  } else {
                    cancelReturn();
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${billMode === 'return-bill'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
              >
                {billMode === 'return-bill' ? (
                  <>
                    <ArrowLeft size={16} /> Back to New Bill
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} /> Sale Return
                  </>
                )}
              </button>

              {billMode === 'new-bill' && (
                <>
                  <button
                    onClick={loadLastInvoice}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart size={16} /> Last Bill
                  </button>
                </>
              )}

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
                onClick={handlePrintInvoice}
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
                      setAvailableCredit(0);
                      clearBill();
                      clearExchangeSession();
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

            {/* ============================================ */}
            {/* NEW BILL MODE */}
            {/* ============================================ */}
            {billMode === 'new-bill' && (
              <>
                {/* Available Credit Banner (from exchange) */}
                {availableCredit > 0 && (
                  <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 dark:border-green-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500 text-white rounded-full p-2">
                          <RotateCcw size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-green-900 dark:text-green-300">
                            Return Credit Available
                          </h3>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            This credit will be automatically deducted from the final bill
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ₹{availableCredit.toFixed(2)}
                        </p>
                        <button
                          onClick={() => {
                            setAvailableCredit(0);
                            clearExchangeSession();
                            toast.success('Exchange credit cleared');
                          }}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          Clear Credit
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Barcode Scanner Mode Section */}
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
                        placeholder="Scan barcode to add item to bill..."
                        disabled={loading}
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
                        💡 <strong>Quick Tip:</strong> Scan barcodes to quickly add items to bill.
                        Each scan adds the item with default price (editable below).
                      </div>
                    </div>
                  )}
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

                          {/* Show credit adjustment if applicable */}
                          {availableCredit > 0 && (
                            <>
                              <div className="flex justify-between text-md font-semibold text-orange-600 dark:text-orange-400 mt-2">
                                <span>Return Credit:</span>
                                <span>-₹{availableCredit.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xl font-bold text-blue-600 dark:text-blue-400 mt-2 pt-2 border-t border-gray-300 dark:border-gray-700">
                                <span>Final Amount:</span>
                                <span>
                                  ₹{totals.finalAmount.toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
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
              </>
            )}

            {/* ============================================ */}
            {/* RETURN BILL MODE */}
            {/* ============================================ */}
            {billMode === 'return-bill' && (
              <div className="space-y-6">
                {/* Search Invoice Section */}
                {!originalInvoice && (
                  <>
                    <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-orange-900 dark:text-orange-300 mb-4">
                        🔍 Search Invoice for Return
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Invoice ID
                          </label>
                          <input
                            type="text"
                            value={searchInvoiceId}
                            onChange={(e) => setSearchInvoiceId(e.target.value)}
                            placeholder="Enter invoice ID"
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Customer Phone
                          </label>
                          <input
                            type="tel"
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            placeholder="Search by phone number"
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <button
                        onClick={searchInvoice}
                        disabled={searchingInvoice}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Search size={18} />
                        {searchingInvoice ? "Searching..." : "Search Invoice"}
                      </button>
                    </div>

                    {/* Recent Invoices */}
                    {recentInvoices.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                          Recent Invoices
                        </h4>
                        <div className="space-y-2">
                          {recentInvoices.map((inv) => (
                            <button
                              key={inv.id}
                              onClick={() => selectInvoiceForReturn(inv)}
                              className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {inv.invoiceId}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {inv.customerName} • {inv.customerPhone}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {new Date(inv.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-600 dark:text-green-400">
                                    ₹{inv.totals?.grandTotal.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {inv.items?.length} item(s)
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Invoice Return Processing */}
                {originalInvoice && (
                  <div className="space-y-6">
                    {/* Invoice Details */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300 mb-4">
                        📋 Original Invoice: {originalInvoice.invoiceId}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {originalInvoice.customerName}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {originalInvoice.customerPhone || "N/A"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Date:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {new Date(originalInvoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Total:</span>
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            ₹{originalInvoice.totals?.grandTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Return Items Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Select Items to Return
                      </h4>

                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr className="text-left">
                              <th className="p-3">
                                <input
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedReturnItems(
                                        new Set(originalInvoice.items.map((item: any) => item.barcode))
                                      );
                                    } else {
                                      setSelectedReturnItems(new Set());
                                    }
                                  }}
                                  className="rounded"
                                />
                              </th>
                              <th className="p-3">Item</th>
                              <th className="p-3">Barcode</th>
                              <th className="p-3">Weight</th>
                              <th className="p-3">Original Price</th>
                              <th className="p-3">Return Value (50%)</th>
                              <th className="p-3">Reason *</th>
                              <th className="p-3">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {originalInvoice.items?.map((item: any, idx: number) => (
                              <tr
                                key={idx}
                                className={`border-b border-gray-200 dark:border-gray-700 ${selectedReturnItems.has(item.barcode)
                                  ? 'bg-orange-50 dark:bg-orange-900/20'
                                  : ''
                                  }`}
                              >
                                <td className="p-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedReturnItems.has(item.barcode)}
                                    onChange={() => toggleReturnItem(item.barcode)}
                                    className="rounded"
                                  />
                                </td>
                                <td className="p-3 font-medium">{item.category}</td>
                                <td className="p-3 font-mono text-xs">{item.barcode}</td>
                                <td className="p-3">{item.weight}</td>
                                <td className="p-3">₹{item.sellingPrice.toFixed(2)}</td>
                                <td className="p-3 font-bold text-orange-600 dark:text-orange-400">
                                  ₹{(item.sellingPrice * 0.5).toFixed(2)}
                                </td>
                                <td className="p-3">
                                  <select
                                    value={returnReasons[item.barcode] || ""}
                                    onChange={(e) => setReturnReasons({
                                      ...returnReasons,
                                      [item.barcode]: e.target.value
                                    })}
                                    disabled={!selectedReturnItems.has(item.barcode)}
                                    className="w-full px-2 py-1 border rounded text-xs disabled:opacity-50"
                                  >
                                    <option value="">Select reason</option>
                                    {RETURN_REASONS.map((reason) => (
                                      <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={returnRemarks[item.barcode] || ""}
                                    onChange={(e) => setReturnRemarks({
                                      ...returnRemarks,
                                      [item.barcode]: e.target.value
                                    })}
                                    disabled={!selectedReturnItems.has(item.barcode)}
                                    placeholder="Optional"
                                    className="w-full px-2 py-1 border rounded text-xs disabled:opacity-50"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Return Calculation */}
                    {selectedReturnItems.size > 0 && returnCalculation && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 dark:border-green-700 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-green-900 dark:text-green-300 mb-4">
                          💰 Return Calculation
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Original Total Value:</span>
                              <span className="font-semibold">
                                ₹{returnCalculation.totalOriginalValue.toFixed(2)}
                              </span>
                            </div>
                            <div className="border-t-2 border-green-500 pt-2 mt-2">
                              <div className="flex justify-between text-xl font-bold text-green-600 dark:text-green-400">
                                <span>Return Value (50%):</span>
                                <span>₹{returnCalculation.totalReturnValue.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-700 rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="settlementMode"
                                  value="exchange"
                                  checked={true}
                                  readOnly
                                  className="text-green-600"
                                />
                                <div>
                                  <p className="font-semibold text-green-900 dark:text-green-300">Exchange Only</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Return items and exchange for new items</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex gap-4">
                          <button
                            onClick={processReturnBill}
                            disabled={processingReturn}
                            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {processingReturn ? (
                              "Processing..."
                            ) : settlementMode === 'exchange' ? (
                              <>Process Return & Add Items</>
                            ) : (
                              <>Process Return</>
                            )}
                          </button>

                          <button
                            onClick={cancelReturn}
                            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
