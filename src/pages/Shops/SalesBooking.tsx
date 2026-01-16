// src/pages/Shops/SalesBooking.tsx - Sales Booking/Order Management
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import toast from "react-hot-toast";
import { Calendar, Phone, Package, Plus, Trash2, Save, FileText, Printer, Download, ShoppingCart, Scan } from "lucide-react";
import { doc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import BarcodeScanner from "../../components/common/BarcodeScanner";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import { getItemByBarcode } from "../../firebase/warehouseItems";
import { createBookingLedgerEntry } from "../../firebase/ledger";
import { useShop, BookingItem, BranchName } from "../../context/ShopContext";
import { createPrintHTML, printDocument } from "../../utils/printUtils";
import { getGSTSettings, GSTSettings, calculateGST, getAppSettings } from "../../firebase/settings";
import { numberToWords } from "../../utils/numberToWords";
import { getAllActiveSalespersons, addSalesperson, deleteSalesperson, Salesperson } from "../../firebase/salespersons";

const DEFAULT_BRANCHES: string[] = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

export default function SalesBooking() {
  const { branchStockCache, setBranchStockCache, currentBooking, updateBooking, clearBooking } = useShop();

  const [selectedBranch, setSelectedBranch] = useState<BranchName>(currentBooking.branch);

  // Customer Details - Initialize from context
  const [partyName, setPartyName] = useState(currentBooking.partyName);
  const [mobileNo, setMobileNo] = useState(currentBooking.mobileNo);
  const [deliveryDate, setDeliveryDate] = useState(currentBooking.deliveryDate);

  // Salesperson
  const [salespersonName, setSalespersonName] = useState(currentBooking.salespersonName);

  // Booking Items - Initialize from context
  const [bookingItems, setBookingItems] = useState<BookingItem[]>(currentBooking.items);

  // Branch Stock
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>(branchStockCache[selectedBranch] || []);
  const [loading, setLoading] = useState(false);

  // Payment Details - Initialize from context
  const [netAmount, setNetAmount] = useState(currentBooking.netAmount || 0);
  const [cashAdvance, setCashAdvance] = useState(currentBooking.cashAdvance || 0);
  const [pendingAmount, setPendingAmount] = useState(currentBooking.pendingAmount || 0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Additional Info
  const [remarks, setRemarks] = useState(currentBooking.remarks);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [lastBooking, setLastBooking] = useState<any>(null);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [savedBookingData, setSavedBookingData] = useState<any>(null);

  // Dynamic branches list
  const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);

  // Barcode scanner mode state
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannedQueue, setScannedQueue] = useState<BookingItem[]>([]);

  // GST Settings
  const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null);
  const [gstType, setGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Dynamic Salespersons State - managed locally
  const [salespersons, setSalespersons] = useState<string[]>([]);

  // Load GST settings and company info
  useEffect(() => {
    loadGSTSettings();
    loadCompanySettings();
    loadSalespersons();
  }, []);

  const loadGSTSettings = async () => {
    try {
      const settings = await getGSTSettings();
      if (settings && settings.defaultType) {
        setGstSettings(settings);
        setGstType(settings.defaultType);
      } else {
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
      setSalespersons(prev => [...prev, name].sort());
      setSalespersonName(name);
      toast.success(`Added salesperson: ${name}`);

      try {
        await addSalesperson(name, selectedBranch);
      } catch (error) {
        console.error("Error saving salesperson:", error);
      }
    }
  };

  // Handler for deleting salesperson
  const handleDeleteSalesperson = async (name: string) => {
    setSalespersons(prev => prev.filter(sp => sp !== name));
    if (salespersonName === name) {
      setSalespersonName("");
    }
    toast.success(`Deleted salesperson: ${name}`);

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

  // Handler to add new branch
  const handleAddBranch = (newBranch: string) => {
    if (!branches.includes(newBranch)) {
      setBranches([...branches, newBranch]);
      toast.success(`Added new branch: ${newBranch}`);
    }
  };

  // Sync with context whenever booking data changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        updateBooking({
          branch: selectedBranch,
          items: bookingItems,
          partyName,
          mobileNo,
          deliveryDate,
          salespersonName,
          netAmount,
          cashAdvance,
          pendingAmount,
          remarks,
        });
      } catch (error) {
        console.error("Error updating booking context:", error);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [bookingItems, selectedBranch, partyName, mobileNo, deliveryDate, salespersonName, netAmount, cashAdvance, pendingAmount, remarks]);

  // Load branch stock (with caching)
  useEffect(() => {
    loadBranchStock();
  }, [selectedBranch]);

  const loadBranchStock = async () => {
    // Check cache first
    if (branchStockCache[selectedBranch] && branchStockCache[selectedBranch].length > 0) {
      const available = branchStockCache[selectedBranch].filter((s) => s.status === "in-branch" || !s.status);
      setBranchStock(available);
      console.log(`✅ Loaded ${available.length} items from cache for ${selectedBranch}`);
      return;
    }

    // Load from Firebase
    setLoading(true);
    try {
      const stock = await getShopStock(selectedBranch);

      // Cache all items
      setBranchStockCache(selectedBranch, stock);

      // Filter only available items
      const available = stock.filter((s) => s.status === "in-branch" || !s.status);
      setBranchStock(available);
      toast.success(`Loaded ${available.length} items from ${selectedBranch}`);
    } catch (error) {
      console.error("Error loading stock:", error);
      toast.error("Failed to load branch stock");
    } finally {
      setLoading(false);
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    try {
      // Check if already in booking
      if (bookingItems.find((i) => i.barcode === barcode)) {
        toast.error(`Item ${barcode} already in booking`);
        return;
      }

      // Find in branch stock
      const stockItem = branchStock.find(
        (s) => s.barcode === barcode || s.label === barcode
      );

      if (!stockItem) {
        toast.error(`Item ${barcode} not found in ${selectedBranch} stock`);
        return;
      }

      if (stockItem.status !== "in-branch") {
        toast.error(`Item ${barcode} is not available (status: ${stockItem.status})`);
        return;
      }

      // Get warehouse item for details
      const warehouseItem = await getItemByBarcode(barcode);

      // Add to booking with new structure
      const sellingPrice = stockItem.sellingPrice || warehouseItem?.sellingPrice || 0;
      const newItem: BookingItem = {
        id: crypto.randomUUID(),
        barcode: barcode,
        category: stockItem.category || warehouseItem?.category || "Unknown",
        subcategory: stockItem.subcategory || warehouseItem?.subcategory || "",
        location: stockItem.location || warehouseItem?.location || "",
        type: stockItem.type || warehouseItem?.type || "",
        weight: String(stockItem.weight || warehouseItem?.weight || "0"),
        costPrice: stockItem.costPrice || warehouseItem?.costPrice || 0,
        sellingPrice: sellingPrice,
        discount: 0,
        taxableAmount: sellingPrice,
        shopStockId: stockItem.id,
        warehouseItemId: warehouseItem?.id,
      };

      const calculatedItem = calculateItemTaxable(newItem);
      setBookingItems((prev) => [...prev, calculatedItem]);

      // Add to scanned queue for visual feedback
      setScannedQueue((prev) => [calculatedItem, ...prev].slice(0, 10)); // Keep last 10

      toast.success(`✅ Added: ${barcode}`);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Clear scanned queue
  const clearScannedQueue = () => {
    setScannedQueue([]);
  };

  // Add new item to booking
  const addBookingItem = () => {
    const newItem: BookingItem = {
      id: crypto.randomUUID(),
      barcode: "",
      category: "",
      subcategory: "",
      location: "",
      type: "",
      weight: "",
      costPrice: 0,
      sellingPrice: 0,
      discount: 0,
      taxableAmount: 0,
    };
    setBookingItems([...bookingItems, newItem]);
  };

  // Calculate item taxable amount (with discount)
  const calculateItemTaxable = (item: BookingItem): BookingItem => {
    const taxable = item.sellingPrice - item.discount;
    return {
      ...item,
      taxableAmount: Math.max(taxable, 0),
    };
  };

  // Update item field
  const updateItem = (id: string, field: keyof BookingItem, value: any) => {
    setBookingItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return calculateItemTaxable(updated);
      })
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setBookingItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculate totals with GST
  const totals = {
    subtotal: bookingItems.reduce((sum, item) => sum + (Number(item.sellingPrice) || 0), 0),
    totalDiscount: bookingItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0),
    taxable: bookingItems.reduce((sum, item) => sum + (Number(item.taxableAmount) || 0), 0),
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

  // Calculate totals
  const calculateTotals = () => {
    const total = totals.grandTotal;
    setTotalAmount(total);
    setNetAmount(total);
    setPendingAmount(total - cashAdvance);
  };

  // Update totals when items or advance changes
  useEffect(() => {
    calculateTotals();
  }, [bookingItems, cashAdvance, gstSettings, gstType]);

  // Save booking
  const handleSaveBooking = async () => {
    // Validation
    if (!partyName.trim()) {
      toast.error("Enter party name");
      return;
    }

    if (!mobileNo.trim()) {
      toast.error("Enter mobile number");
      return;
    }

    if (!salespersonName.trim()) {
      toast.error("Enter salesperson name");
      return;
    }

    if (!deliveryDate) {
      toast.error("Select delivery date");
      return;
    }

    if (bookingItems.length === 0) {
      toast.error("Add at least one item to the booking");
      return;
    }

    // Check if all items have required fields
    const invalidItems = bookingItems.filter(
      (item) => !item.itemName.trim() || !item.weight
    );
    if (invalidItems.length > 0) {
      toast.error("Please fill item name and weight for all items");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Saving booking...");

    try {
      const bookingId = `BOOK-${selectedBranch}-${Date.now()}`;
      const bookingNo = `${selectedBranch.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

      // Save booking to Firestore
      const bookingRef = doc(db, "shops", selectedBranch, "bookings", bookingId);
      await setDoc(bookingRef, {
        bookingId,
        bookingNo,
        branch: selectedBranch,
        partyName,
        mobileNo,
        deliveryDate,
        salespersonName,
        items: bookingItems.map((item) => ({
          barcode: item.barcode,
          itemName: item.itemName,
          stoneSapphire: item.stoneSapphire,
          trNo: item.trNo,
          pieces: item.pieces,
          weight: item.weight,
          total: item.total,
        })),
        netAmount,
        cashAdvance,
        totalAmount,
        pendingAmount,
        remarks,
        status: "pending",
        createdAt: new Date().toISOString(),
        createdBy: "current-user", // TODO: Get from auth
      });

      toast.dismiss(loadingToast);
      toast.success(`✅ Booking saved! Booking No: ${bookingNo}`);

      // Create ledger entry for booking with advance
      try {
        await createBookingLedgerEntry(
          selectedBranch,
          bookingId,
          bookingNo,
          partyName,
          mobileNo,
          netAmount,
          cashAdvance,
          pendingAmount,
          salespersonName,
          "current-user" // TODO: Get from auth
        );
        console.log("✅ Ledger entry created for booking");
      } catch (ledgerError) {
        console.error("Error creating ledger entry:", ledgerError);
        // Don't fail the booking if ledger fails
        toast("⚠️ Booking saved but ledger entry failed", { duration: 3000 });
      }

      // Save booking data for preview
      setSavedBookingData({
        bookingNo,
        bookingId,
        branch: selectedBranch,
        partyName,
        mobileNo,
        deliveryDate,
        salespersonName,
        items: bookingItems,
        totalAmount,
        netAmount,
        cashAdvance,
        pendingAmount,
        remarks,
        createdAt: new Date().toISOString(),
      });

      // Show preview modal
      setShowPreviewModal(true);

    } catch (error) {
      console.error("Error saving booking:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to save booking");
    } finally {
      setLoading(false);
    }
  };

  // Handle print from modal - Use popup window for reliable printing
  const handlePrintBooking = () => {
    if (!savedBookingData) return;

    const fmt = (num: number) => (num || 0).toFixed(2);
    const dateStr = new Date(savedBookingData.createdAt).toLocaleDateString('en-GB');
    const timeStr = new Date(savedBookingData.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Calculate GST if not in saved data
    const netAmount = savedBookingData.netAmount || 0;
    const gstRate = gstSettings?.cgst || 1.5;
    const cgst = (netAmount * gstRate) / 100;
    const sgst = (netAmount * gstRate) / 100;
    const totalWithGST = netAmount + cgst + sgst;

    const itemsHtml = savedBookingData.items.map((item: any, idx: number) => {
      const itemTaxable = (item.sellingPrice || 0) - (item.discount || 0);
      return `
      <tr style="height: 24px;">
        <td style="text-align: center;">${idx + 1}</td>
        <td>${item.category || item.itemName || ''}</td>
        <td style="text-align: center; font-family: monospace;">${item.barcode || ''}</td>
        <td style="text-align: center;">${item.location || ''}</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">${item.weight || ''}</td>
        <td style="text-align: center;">${item.type || ''}</td>
        <td style="text-align: right;">${fmt(item.sellingPrice || 0)}</td>
        <td style="text-align: right;">${fmt(item.discount || 0)}</td>
        <td style="text-align: right;">${fmt(item.taxableAmount || itemTaxable)}</td>
      </tr>
    `;
    }).join('');

    // Fill empty rows to maintain height
    const emptyRowsCount = Math.max(0, 8 - savedBookingData.items.length);
    const emptyRowsHtml = Array(emptyRowsCount).fill(0).map(() => `
      <tr style="height: 24px;">
        <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking - ${savedBookingData.partyName}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 10px; 
            color: #000; 
            font-size: 10px;
            line-height: 1.3;
          }
          
          .invoice-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          
          .invoice-header h1 {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 5px 0;
            text-transform: uppercase;
          }
          
          .invoice-header p {
            margin: 2px 0;
            font-size: 10px;
          }
          
          .original-badge {
            float: right;
            border: 1px solid #000;
            padding: 3px 8px;
            font-size: 10px;
            font-weight: bold;
          }
          
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 10px;
          }
          
          .party-details {
            margin-bottom: 10px;
            font-size: 10px;
            border: 1px solid #000;
            padding: 5px;
          }
          
          .party-details p {
            margin: 2px 0;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 9px; 
            margin-bottom: 12px;
          }
          
          th { 
            border: 1px solid #000; 
            padding: 4px; 
            background: #f0f0f0; 
            font-weight: bold;
            text-align: left;
          }
          
          td { 
            border: 1px solid #000; 
            padding: 3px 4px; 
          }
          
          .totals-section {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin-top: 12px;
          }
          
          .words-section {
            width: 55%;
            font-size: 9px;
          }
          
          .amounts-section {
            width: 42%;
            border: 1px solid #000;
          }
          
          .amounts-section table {
            width: 100%;
            font-size: 9px;
          }
          
          .amounts-section td {
            padding: 4px;
            border-bottom: 1px solid #ddd;
          }
          
          .total-row {
            font-weight: bold;
            background-color: #f5f5f5;
          }
          
          .signature-section {
            margin-top: 40px;
            text-align: right;
            font-size: 10px;
          }
          
          .signature-line {
            margin-top: 30px;
            border-top: 1px solid #000;
            width: 150px;
            margin-left: auto;
            padding-top: 5px;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>

        <!-- Invoice Header -->
        <div class="invoice-header">
          <h1>${companySettings?.companyName || "MANGALMURTHI JEWELLERY LTD"}</h1>
          <p>Address: ${companySettings?.companyAddress || "10TH SWARN MARKET, OPERA HOUSE, Mumbai - 400004"}</p>
          <p>Ph: ${companySettings?.companyPhone || "[Phone Number]"} | Web: ${companySettings?.companyWebsite || "www.mangalmurthijewellery.com"}</p>
          <p><strong>GSTIN: ${companySettings?.companyGSTIN || "[GST NUMBER]"}</strong></p>
          <p style="margin-top: 6px; font-weight: bold;">
            Sales Booking <span class="original-badge">ORIGINAL</span>
          </p>
        </div>
        
        <!-- Invoice Meta -->
        <div class="invoice-meta">
          <div>
            <p><strong>Booking No:</strong> ${savedBookingData.bookingNo || 'N/A'}</p>
            <p><strong>Booking Date:</strong> ${dateStr} ${timeStr}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Location:</strong> ${savedBookingData.branch || selectedBranch}</p>
            <p><strong>Delivery Date:</strong> ${savedBookingData.deliveryDate || 'N/A'}</p>
          </div>
        </div>
        
        <!-- Party & Staff Details -->
        <div class="party-details">
          <p><strong>Party Name:</strong> ${savedBookingData.partyName}</p>
          <p><strong>Mo:</strong> ${savedBookingData.mobileNo || ''}</p>
          <p><strong>Emp Name:</strong> ${savedBookingData.salespersonName || ''}</p>
        </div>
        
        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">SNO</th>
              <th>ITEM NAME</th>
              <th style="width: 80px;">BARCODE</th>
              <th style="width: 40px;">LOCT</th>
              <th style="width: 30px; text-align: center;">PCS</th>
              <th style="width: 60px; text-align: right;">WEIGHT</th>
              <th style="width: 40px;">TYPE</th>
              <th style="width: 70px; text-align: right;">RATE</th>
              <th style="width: 60px; text-align: right;">DISCOUNT</th>
              <th style="width: 80px; text-align: right;">TAXABLE VALUE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            ${emptyRowsHtml}
          </tbody>
        </table>
        
        <!-- Totals Section -->
        <div class="totals-section">
          <!-- Left: Amount in Words & Description -->
          <div class="words-section">
            <p style="margin: 5px 0; font-weight: bold;">
              Rupees: ${numberToWords(totalWithGST)}
            </p>
            <div style="margin-top: 30px; font-size: 8px;">
              <p><strong>Remarks:</strong> ${savedBookingData.remarks || '-'}</p>
              <p style="margin-top: 15px;"><strong>GST No:</strong> ${companySettings?.companyGSTIN || "[GST NUMBER]"}</p>
              <p><strong>State:</strong> Maharashtra</p>
            </div>
          </div>
          
          <!-- Right: Amounts -->
          <div class="amounts-section">
            <table>
              <tr>
                <td>Net Amount:</td>
                <td style="text-align: right;">${fmt(netAmount)}</td>
              </tr>
              ${gstType === "cgst_sgst" ? `
                <tr>
                  <td>SGST ${gstRate}%:</td>
                  <td style="text-align: right;">${fmt(sgst)}</td>
                </tr>
                <tr>
                  <td>CGST ${gstRate}%:</td>
                  <td style="text-align: right;">${fmt(cgst)}</td>
                </tr>
              ` : `
                <tr>
                  <td>IGST ${(gstSettings?.igst || 3)}%:</td>
                  <td style="text-align: right;">${fmt(cgst + sgst)}</td>
                </tr>
              `}
              <tr class="total-row">
                <td><strong>Bill Amount:</strong></td>
                <td style="text-align: right;"><strong>${fmt(totalWithGST)}</strong></td>
              </tr>
              <tr>
                <td>Advance Amt:</td>
                <td style="text-align: right;">${fmt(savedBookingData.cashAdvance)}</td>
              </tr>
              <tr>
                <td>Cash Amount:</td>
                <td style="text-align: right;">${fmt(savedBookingData.cashAdvance)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Bill Outstanding:</strong></td>
                <td style="text-align: right;"><strong>${fmt(savedBookingData.pendingAmount || (totalWithGST - savedBookingData.cashAdvance))}</strong></td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Signature -->
        <div class="signature-section">
          <p style="margin: 0;">For: ${companySettings?.companyName || "MANGALMURTHI JEWELLERY LTD"}</p>
          <div class="signature-line">
            Signature
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Auto-print when loaded
    printWindow.onload = function () {
      setTimeout(function () {
        printWindow.print();
      }, 500);
    };

    setShowPreviewModal(false);
  };

  // Close modal and optionally clear
  const handleCloseModal = () => {
    setShowPreviewModal(false);

    const shouldClear = window.confirm(
      "Do you want to clear the form and start a new booking?"
    );

    if (shouldClear) {
      clearBooking();
      setPartyName("");
      setMobileNo("");
      setDeliveryDate("");
      setSalespersonName("");
      setBookingItems([]);
      setCashAdvance(0);
      setNetAmount(0);
      setPendingAmount(0);
      setTotalAmount(0);
      setRemarks("");
    }
  };

  // Load last booking
  const loadLastBooking = async () => {
    try {
      const bookingsRef = collection(db, "shops", selectedBranch, "bookings");
      const q = query(bookingsRef, orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setLastBooking(snap.docs[0].data());
        setShowHistory(true);
        toast.success("Last booking loaded");
      } else {
        toast("No previous bookings found");
      }
    } catch (error) {
      console.error("Error loading last booking:", error);
      toast.error("Failed to load booking history");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (bookingItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const data = bookingItems.map((item, idx) => ({
      "SNO": idx + 1,
      "Item Name": item.itemName,
      "Stone/Sapphire": item.stoneSapphire,
      "Tr No": item.trNo,
      "Pcs": item.pieces,
      "Weight": item.weight,
      "Total": item.total,
    }));

    // Add summary
    data.push({
      "SNO": "",
      "Item Name": "",
      "Stone/Sapphire": "",
      "Tr No": "",
      "Pcs": "",
      "Weight": "TOTAL",
      "Total": totalAmount,
    } as any);

    data.push({} as any); // Empty row
    data.push({
      "SNO": "",
      "Item Name": "Net Amount",
      "Stone/Sapphire": "",
      "Tr No": "",
      "Pcs": "",
      "Weight": "",
      "Total": netAmount,
    } as any);
    data.push({
      "SNO": "",
      "Item Name": "Cash Advance",
      "Stone/Sapphire": "",
      "Tr No": "",
      "Pcs": "",
      "Weight": "",
      "Total": cashAdvance,
    } as any);
    data.push({
      "SNO": "",
      "Item Name": "Pending Amt",
      "Stone/Sapphire": "",
      "Tr No": "",
      "Pcs": "",
      "Weight": "",
      "Total": pendingAmount,
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Booking");
    XLSX.writeFile(workbook, `Booking_${partyName}_${Date.now()}.xlsx`);
    toast.success("Excel exported");
  };

  // Export to PDF - Professional Format
  const exportToPDF = () => {
    if (bookingItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Company Header
    doc.setFillColor(0, 128, 128); // Teal color
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SUWARNASPARSH JEWELLERS", pageWidth / 2, 12, { align: "center" });
    doc.setFontSize(12);
    doc.text("SALES BOOKING", pageWidth / 2, 20, { align: "center" });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Booking Details Box
    doc.setDrawColor(0, 128, 128);
    doc.setLineWidth(0.5);
    doc.rect(14, 30, pageWidth - 28, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Branch:", 18, 38);
    doc.text("Date:", 18, 46);
    doc.text("Party Name:", 18, 54);
    doc.text("Mobile:", 18, 62);

    doc.text("Delivery Date:", pageWidth / 2, 38);
    doc.text("Salesperson:", pageWidth / 2, 46);

    doc.setFont("helvetica", "normal");
    doc.text(selectedBranch, 50, 38);
    doc.text(new Date().toLocaleDateString('en-GB'), 50, 46);
    doc.text(partyName, 50, 54);
    doc.text(mobileNo, 50, 62);
    doc.text(deliveryDate, pageWidth / 2 + 35, 38);
    doc.text(salespersonName, pageWidth / 2 + 35, 46);

    // Table with professional styling
    const tableData = bookingItems.map((item, idx) => [
      idx + 1,
      item.itemName,
      item.stoneSapphire || "-",
      item.trNo || "-",
      item.pieces,
      item.weight,
      `₹${item.total.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 75,
      head: [["#", "Item Name", "Stone/Sapphire", "Tr No", "Pcs", "Weight", "Amount"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [0, 128, 128],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        4: { halign: "center", cellWidth: 15 },
        5: { halign: "right", cellWidth: 20 },
        6: { halign: "right", cellWidth: 25 },
      },
    });

    // Totals Box
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setDrawColor(0, 128, 128);
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - 80, finalY, 66, 45);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Items Total:", pageWidth - 76, finalY + 10);
    doc.text(`₹${totalAmount.toFixed(2)}`, pageWidth - 18, finalY + 10, { align: "right" });

    doc.text("Net Amount:", pageWidth - 76, finalY + 18);
    doc.text(`₹${(netAmount || 0).toFixed(2)}`, pageWidth - 18, finalY + 18, { align: "right" });

    doc.text("Cash Advance:", pageWidth - 76, finalY + 26);
    doc.setTextColor(0, 128, 0);
    doc.text(`₹${(cashAdvance || 0).toFixed(2)}`, pageWidth - 18, finalY + 26, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Pending:", pageWidth - 76, finalY + 38);
    doc.setTextColor(220, 0, 0);
    doc.text(`₹${(pendingAmount || 0).toFixed(2)}`, pageWidth - 18, finalY + 38, { align: "right" });

    // Remarks
    doc.setTextColor(0, 0, 0);
    if (remarks) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(`Remarks: ${remarks}`, 14, finalY + 15);
    }

    // Signatures
    const sigY = finalY + 60;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.line(14, sigY, 60, sigY);
    doc.line(pageWidth - 60, sigY, pageWidth - 14, sigY);
    doc.text("Customer Signature", 14, sigY + 5);
    doc.text("Authorized Signatory", pageWidth - 60, sigY + 5);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 285);

    doc.save(`Booking_${partyName}_${Date.now()}.pdf`);
    toast.success("PDF exported");
  };

  // Print booking
  const handlePrint = () => {
    if (bookingItems.length === 0) {
      toast.error("No items to print");
      return;
    }

    const bookingNo = `BKG-${Date.now().toString().slice(-5)}`;

    const printHTML = createPrintHTML({
      title: `Sales Booking ${bookingNo}`,
      styles: `
        .invoice-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        
        .invoice-header h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 5px 0;
          text-transform: uppercase;
        }
        
        .invoice-header p {
          margin: 2px 0;
          font-size: 10px;
        }
        
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 10px;
        }
        
        .party-details {
          margin-bottom: 10px;
          font-size: 10px;
          border: 1px solid #000;
          padding: 5px;
        }
        
        .party-details p {
          margin: 2px 0;
        }
        
        .items-table {
          font-size: 9px;
          margin-bottom: 12px;
        }
        
        .items-table th {
          background-color: #f0f0f0;
          padding: 4px;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          text-align: left;
        }
        
        .items-table td {
          padding: 3px 4px;
          border-bottom: 1px solid #ddd;
        }
        
        .totals-section {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin-top: 12px;
        }
        
        .words-section {
          width: 55%;
          font-size: 9px;
        }
        
        .amounts-section {
          width: 42%;
          border: 1px solid #000;
        }
        
        .amounts-section table {
          width: 100%;
          font-size: 9px;
        }
        
        .amounts-section td {
          padding: 4px;
          border-bottom: 1px solid #ddd;
        }
        
        .total-row {
          font-weight: bold;
          background-color: #f5f5f5;
        }
        
        .signature-section {
          margin-top: 40px;
          text-align: right;
          font-size: 10px;
        }
        
        .signature-line {
          margin-top: 30px;
          border-top: 1px solid #000;
          width: 150px;
          margin-left: auto;
          padding-top: 5px;
        }
        
        .original-badge {
          float: right;
          border: 1px solid #000;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: bold;
        }
      `,
      bodyContent: `
        <!-- Invoice Header -->
        <div class="invoice-header">
          <h1>${companySettings?.companyName || "MANGALMURTHI JEWELLERY LTD"}</h1>
          <p>Address: ${companySettings?.companyAddress || "10TH SWARN MARKET, OPERA HOUSE HOUSE, Mumbai - 400004"}</p>
          <p>Ph: ${companySettings?.companyPhone || "[Phone Number]"} | Web: ${companySettings?.companyWebsite || "www.mangalmurthijewellery.com"}</p>
          <p><strong>GSTIN: ${companySettings?.companyGSTIN || "[GST NUMBER]"}</strong></p>
          <p style="margin-top: 6px; font-weight: bold;">
            Sales Book - 1 <span class="original-badge">ORIGINAL</span>
          </p>
        </div>
        
        <!-- Invoice Meta -->
        <div class="invoice-meta">
          <div>
            <p><strong>Bill No:</strong> ${bookingNo}</p>
            <p><strong>Bill Date:</strong> ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Location:</strong> ${selectedBranch}</p>
          </div>
        </div>
        
        <!-- Party & Staff Details -->
        <div class="party-details">
          <p><strong>Party Name:</strong> ${partyName || "[CUSTOMER NAME]"}</p>
          <p><strong>Mo:</strong> ${mobileNo || "[Phone No]"}</p>
          <p><strong>Emp Name:</strong> ${salespersonName || "[Employee Name]"}</p>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 25px;">SNO</th>
              <th>ITEM NAME</th>
              <th style="width: 80px;">BARCODE</th>
              <th style="width: 40px;">LOCT</th>
              <th style="width: 30px; text-align: center;">PCS</th>
              <th style="width: 60px; text-align: right;">WEIGHT</th>
              <th style="width: 40px;">TYPE</th>
              <th style="width: 70px; text-align: right;">RATE</th>
              <th style="width: 60px; text-align: right;">DISCOUNT</th>
              <th style="width: 80px; text-align: right;">TAXABLE VALUE</th>
            </tr>
          </thead>
          <tbody>
            ${bookingItems.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.category}</td>
                <td style="font-family: monospace;">${item.barcode || ''}</td>
                <td class="text-center">${item.location}</td>
                <td class="text-center">1</td>
                <td class="text-right">${item.weight}</td>
                <td class="text-center">${item.type}</td>
                <td class="text-right">${(item.sellingPrice || 0).toFixed(2)}</td>
                <td class="text-right">${(item.discount || 0).toFixed(2)}</td>
                <td class="text-right">${(item.taxableAmount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Totals Section -->
        <div class="totals-section">
          <!-- Left: Amount in Words & Description -->
          <div class="words-section">
            <p style="margin: 5px 0; font-weight: bold;">
              Rupees: ${numberToWords(totals.grandTotal)}
            </p>
            <div style="margin-top: 30px; font-size: 8px;">
              <p><strong>Vch Desc:</strong> ORDER AMOUNT=${totals.taxable.toFixed(2)} & CASH RECEIVED VOUCHER</p>
              <p style="margin-top: 15px;"><strong>GST No:</strong> ${companySettings?.companyGSTIN || "[GST NUMBER]"}</p>
              <p><strong>State:</strong> Maharashtra</p>
            </div>
          </div>
          
          <!-- Right: Amounts -->
          <div class="amounts-section">
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
              <tr>
                <td>Advance Amt:</td>
                <td class="text-right">${(cashAdvance || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Cash Amount:</td>
                <td class="text-right">${(cashAdvance || 0).toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Bill Outstanding:</strong></td>
                <td class="text-right"><strong>${(pendingAmount || 0).toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Signature -->
        <div class="signature-section">
          <p style="margin: 0;">For: ${companySettings?.companyName || "MANGALMURTHI JEWELLERY LTD"}</p>
          <div class="signature-line">
            Signature
          </div>
        </div>
      `
    });

    printDocument(printHTML);
  };

  return (
    <>
      <PageMeta
        title="Sales Booking - Order Management"
        description="Create and manage customer orders and bookings"
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide the main app container */
          #root > div {
            display: none !important;
          }
          
          /* Show only the invoice-print section */
          .invoice-print {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            z-index: 9999 !important;
            overflow: visible !important;
          }
          
          /* Hide no-print elements */
          .no-print {
            display: none !important;
          }
          
          /* Invoice Header */
          .invoice-header {
            text-align: center !important;
            border-bottom: 2px solid #000 !important;
            padding-bottom: 10px !important;
            margin-bottom: 15px !important;
          }
          
          .company-name {
            font-size: 24px !important;
            font-weight: bold !important;
            margin-bottom: 5px !important;
            color: #000 !important;
          }
          
          .company-address {
            font-size: 12px !important;
            color: #000 !important;
          }
          
          /* Invoice Info Grid */
          .invoice-info {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
            margin-bottom: 15px !important;
            font-size: 11px !important;
            color: #000 !important;
          }
          
          .invoice-info-label {
            font-weight: bold !important;
            color: #000 !important;
          }
          
          .invoice-info-value {
            color: #000 !important;
          }
          
          /* Table Styling */
          .invoice-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 15px 0 !important;
          }
          
          .invoice-table th,
          .invoice-table td {
            border: 1px solid #000 !important;
            padding: 6px !important;
            font-size: 11px !important;
            color: #000 !important;
          }
          
          .invoice-table th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Totals Section */
          .invoice-totals {
            float: right !important;
            width: 300px !important;
            margin-top: 10px !important;
          }
          
          .invoice-totals-row {
            display: flex !important;
            justify-content: space-between !important;
            padding: 5px 0 !important;
            font-size: 12px !important;
            color: #000 !important;
          }
          
          .invoice-totals-row.total {
            border-top: 2px solid #000 !important;
            font-weight: bold !important;
            font-size: 14px !important;
            padding-top: 8px !important;
            margin-top: 5px !important;
          }
          
          /* Footer */
          .invoice-footer {
            margin-top: 60px !important;
            padding-top: 20px !important;
            border-top: 1px solid #000 !important;
            clear: both !important;
          }
          
          .invoice-signatures {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 40px !important;
          }
          
          .invoice-signature {
            text-align: center !important;
            width: 200px !important;
          }
          
          .invoice-signature-line {
            border-top: 1px solid #000 !important;
            padding-top: 5px !important;
            margin-top: 50px !important;
            font-size: 11px !important;
            color: #000 !important;
          }
          
          /* Payment Section */
          .invoice-payment {
            margin: 15px 0 !important;
            padding: 10px !important;
            border: 1px solid #000 !important;
          }
          
          .invoice-payment-title {
            font-weight: bold !important;
            margin-bottom: 5px !important;
            color: #000 !important;
          }
          
          /* Page Setup */
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📋 Sales Booking / Order Management"
            subtitle="Create advance orders and bookings for customers"
          >
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <div className="flex items-start gap-3">
                <FileText className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-purple-800 dark:text-purple-400 mb-1">
                    📝 Sales Booking Process
                  </h3>
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    Record customer orders with advance payment. Track delivery dates and pending amounts.
                    Perfect for custom jewelry orders and special requests.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={loadLastBooking}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <ShoppingCart size={16} /> Last Booking
              </button>
              <button
                onClick={exportToExcel}
                disabled={bookingItems.length === 0}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} /> Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={bookingItems.length === 0}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} /> PDF
              </button>
              <button
                onClick={handlePrint}
                disabled={bookingItems.length === 0}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={16} /> Print
              </button>
            </div>

            {/* Customer & Booking Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  Branch
                </label>
                <CustomDropdown
                  options={branches}
                  value={selectedBranch}
                  onChange={(val) => setSelectedBranch(val as BranchName)}
                  onAddNew={handleAddBranch}
                  placeholder="Select Branch"
                  addNewPlaceholder="Add branch..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  Party Name *
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  <Phone className="inline mr-1" size={14} />
                  Mobile No *
                </label>
                <input
                  type="tel"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  <Calendar className="inline mr-1" size={14} />
                  Delivery Date *
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Salesperson */}
            <div className="mb-6">
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
                    placeholder="Scan barcode to add item from stock..."
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
                              {item.itemName}
                            </span>
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 rounded p-2">
                    💡 <strong>Quick Tip:</strong> Scan barcodes to quickly add items from branch stock to booking.
                    Each scan adds the item with its current weight and details.
                  </div>
                </div>
              )}
            </div>

            {/* Booking Items */}
            <div className="mb-6 print-area">
              <div className="flex items-center justify-between mb-4 no-print">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <Package className="inline mr-2" size={20} />
                  Booking Items
                </h3>
                <button
                  onClick={addBookingItem}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>

              {/* Editable Table */}
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
                    {bookingItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <td className="p-3">{idx + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.category}
                            onChange={(e) => updateItem(item.id, "category", e.target.value)}
                            placeholder="Item name"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.barcode || ''}
                            onChange={(e) => updateItem(item.id, "barcode", e.target.value)}
                            placeholder="Barcode"
                            className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.location}
                            onChange={(e) => updateItem(item.id, "location", e.target.value)}
                            placeholder="Loct"
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3">1</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.weight}
                            onChange={(e) => updateItem(item.id, "weight", e.target.value)}
                            placeholder="0.00"
                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.type}
                            onChange={(e) => updateItem(item.id, "type", e.target.value)}
                            placeholder="Type"
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={item.sellingPrice || 0}
                            onChange={(e) => updateItem(item.id, "sellingPrice", Number(e.target.value))}
                            placeholder="0.00"
                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            min="0"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e) => updateItem(item.id, "discount", Number(e.target.value))}
                            placeholder="0.00"
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            min="0"
                            max={item.sellingPrice || 0}
                          />
                        </td>
                        <td className="p-3 font-semibold">₹{((item.taxableAmount) || 0).toFixed(2)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {bookingItems.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-gray-500">
                          <Package size={48} className="mx-auto mb-2 opacity-50" />
                          <p>No items in booking. Scan barcodes or click "Add Item" to start.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Totals Footer with GST */}
                  {bookingItems.length > 0 && (
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-700">
                      <tr>
                        <td colSpan={9} className="p-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                          Subtotal:
                        </td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                          ₹{(totals.subtotal || 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={9} className="p-3 text-right text-gray-700 dark:text-gray-300">
                          Discount:
                        </td>
                        <td className="p-3 text-gray-900 dark:text-white">
                          -₹{(totals.totalDiscount || 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={9} className="p-3 text-right text-gray-700 dark:text-gray-300">
                          Taxable Amount:
                        </td>
                        <td className="p-3 text-gray-900 dark:text-white">
                          ₹{(totals.taxable || 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      {gstType === "cgst_sgst" ? (
                        <>
                          <tr>
                            <td colSpan={9} className="p-3 text-right text-gray-700 dark:text-gray-300">
                              CGST {gstSettings?.cgst || 1.5}%:
                            </td>
                            <td className="p-3 text-gray-900 dark:text-white">
                              ₹{(totals.cgst || 0).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={9} className="p-3 text-right text-gray-700 dark:text-gray-300">
                              SGST {gstSettings?.sgst || 1.5}%:
                            </td>
                            <td className="p-3 text-gray-900 dark:text-white">
                              ₹{(totals.sgst || 0).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-3 text-right text-gray-700 dark:text-gray-300">
                            IGST {gstSettings?.igst || 3}%:
                          </td>
                          <td className="p-3 text-gray-900 dark:text-white">
                            ₹{(totals.igst || 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                        <td colSpan={9} className="p-3 text-right font-bold text-lg text-gray-700 dark:text-gray-300">
                          Grand Total:
                        </td>
                        <td className="p-3 font-bold text-lg text-primary">
                          ₹{(totals.grandTotal || 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Payment Details */}
            {bookingItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <label className="block text-sm font-semibold mb-2 text-blue-900 dark:text-blue-300">
                    Net Amount (Grand Total)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={totals.grandTotal.toFixed(2)}
                      readOnly
                      className="w-full pl-8 pr-3 py-3 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white text-lg font-semibold cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    Total with GST (Auto-calculated)
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800">
                  <label className="block text-sm font-semibold mb-2 text-green-900 dark:text-green-300">
                    Cash Advance
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={cashAdvance}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCashAdvance(val);
                        setPendingAmount(totals.grandTotal - val);
                      }}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-3 border-2 border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                    Amount paid in advance
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <label className="block text-sm font-semibold mb-2 text-orange-900 dark:text-orange-300">
                    Pending Amount (Payable)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={(pendingAmount || 0).toFixed(2)}
                      readOnly
                      className="w-full pl-8 pr-3 py-3 border-2 border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-gray-900 dark:text-white text-lg font-semibold cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                    Balance to be collected on delivery
                  </p>
                </div>
              </div>
            )}

            {/* Remarks */}
            {bookingItems.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Remarks / Special Instructions
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {/* Save Button */}
            {bookingItems.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveBooking}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Save size={24} />
                  {loading ? "Saving..." : "Save Booking"}
                </button>
              </div>
            )}

            {/* Last Booking History */}
            {showHistory && lastBooking && (
              <div className="mt-6 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300">
                    📜 Last Booking
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
                    <span className="text-gray-600 dark:text-gray-400">Booking No:</span>
                    <p className="font-semibold">{lastBooking.bookingNo}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Party Name:</span>
                    <p className="font-semibold">{lastBooking.partyName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Mobile:</span>
                    <p className="font-semibold">{lastBooking.mobileNo}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Delivery Date:</span>
                    <p className="font-semibold">{lastBooking.deliveryDate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Salesperson:</span>
                    <p className="font-semibold">{lastBooking.salespersonName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <p className="font-semibold capitalize">
                      <span className={`px-2 py-1 rounded text-xs ${lastBooking.status === "pending"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                        {lastBooking.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <p className="font-semibold">
                      {new Date(lastBooking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-100 dark:bg-purple-900/40">
                      <tr className="text-left">
                        <th className="p-2">#</th>
                        <th className="p-2">Item Name</th>
                        <th className="p-2">Stone/Sapphire</th>
                        <th className="p-2">Tr No</th>
                        <th className="p-2">Pcs</th>
                        <th className="p-2">Weight</th>
                        <th className="p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastBooking.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-purple-200 dark:border-purple-800">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{item.itemName}</td>
                          <td className="p-2">{item.stoneSapphire || "-"}</td>
                          <td className="p-2">{item.trNo || "-"}</td>
                          <td className="p-2">{item.pieces}</td>
                          <td className="p-2">{item.weight}</td>
                          <td className="p-2 font-semibold">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-purple-100 dark:bg-purple-900/40 rounded-lg p-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Items Total:</span>
                    <p className="font-bold text-lg">₹{lastBooking.totalAmount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Net Amount:</span>
                    <p className="font-bold text-lg">₹{lastBooking.netAmount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Cash Advance:</span>
                    <p className="font-bold text-lg text-green-600 dark:text-green-400">
                      ₹{lastBooking.cashAdvance?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Pending Amount:</span>
                    <p className="font-bold text-lg text-red-600 dark:text-red-400">
                      ₹{lastBooking.pendingAmount?.toFixed(2)}
                    </p>
                  </div>
                </div>

                {lastBooking.remarks && (
                  <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Remarks:</span>
                    <p className="text-sm mt-1">{lastBooking.remarks}</p>
                  </div>
                )}
              </div>
            )}
          </TASection>
        </div>
      </div>

      {/* Preview Modal (Like Distribution Challan) */}
      {showPreviewModal && savedBookingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="no-print flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                📋 Booking Preview
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintBooking}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <Printer size={20} />
                  Print
                </button>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content - Professional Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="invoice-print bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-[210mm] mx-auto">
                {/* SECTION 1: HEADER */}
                <div className="invoice-header">
                  <div className="company-name">SALES BOOKING</div>
                  <div className="company-address">
                    Branch: {savedBookingData.branch}
                  </div>
                </div>

                {/* SECTION 2: META INFO */}
                <div className="invoice-meta">
                  <div className="invoice-meta-row">
                    <div className="invoice-meta-label">Booking No:</div>
                    <div className="invoice-meta-value">{savedBookingData.bookingNo}</div>
                    <div className="invoice-meta-label">Date:</div>
                    <div className="invoice-meta-value">{new Date(savedBookingData.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="invoice-meta-row">
                    <div className="invoice-meta-label">Party Name:</div>
                    <div className="invoice-meta-value">{savedBookingData.partyName}</div>
                    <div className="invoice-meta-label">Mobile:</div>
                    <div className="invoice-meta-value">{savedBookingData.mobileNo}</div>
                  </div>
                  <div className="invoice-meta-row">
                    <div className="invoice-meta-label">Delivery Date:</div>
                    <div className="invoice-meta-value">{savedBookingData.deliveryDate}</div>
                    <div className="invoice-meta-label">Salesperson:</div>
                    <div className="invoice-meta-value">{savedBookingData.salespersonName}</div>
                  </div>
                </div>

                {/* SECTION 3: ITEMS TABLE */}
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th className="col-sno">#</th>
                      <th className="col-item">ITEM NAME</th>
                      <th className="col-remark">STONE/SAPPHIRE</th>
                      <th className="col-hsn">TR NO</th>
                      <th className="col-pcs">PCS</th>
                      <th className="col-weight">WEIGHT</th>
                      <th className="col-amount">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedBookingData.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="col-sno">{idx + 1}</td>
                        <td className="col-item">{item.itemName}</td>
                        <td className="col-remark">{item.stoneSapphire}</td>
                        <td className="col-hsn">{item.trNo}</td>
                        <td className="col-pcs">{item.pieces}</td>
                        <td className="col-weight">{item.weight}</td>
                        <td className="col-amount">₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* SECTION 4: TOTALS */}
                <div className="invoice-totals">
                  <div className="invoice-totals-row subtotal">
                    <div className="invoice-totals-label">Items Total:</div>
                    <div className="invoice-totals-value">₹{savedBookingData.totalAmount.toFixed(2)}</div>
                  </div>
                  <div className="invoice-totals-row">
                    <div className="invoice-totals-label">Net Amount:</div>
                    <div className="invoice-totals-value">₹{(savedBookingData.netAmount || 0).toFixed(2)}</div>
                  </div>
                  <div className="invoice-totals-row">
                    <div className="invoice-totals-label">Cash Advance:</div>
                    <div className="invoice-totals-value">₹{(savedBookingData.cashAdvance || 0).toFixed(2)}</div>
                  </div>
                  <div className="invoice-totals-row total">
                    <div className="invoice-totals-label">Pending Amount:</div>
                    <div className="invoice-totals-value">₹{(savedBookingData.pendingAmount || 0).toFixed(2)}</div>
                  </div>
                </div>

                {/* SECTION 5: REMARKS */}
                {savedBookingData.remarks && (
                  <div className="invoice-payment">
                    <div className="invoice-payment-title">REMARKS</div>
                    <div>{savedBookingData.remarks}</div>
                  </div>
                )}

                {/* SECTION 6: FOOTER */}
                <div className="invoice-footer">
                  <div className="invoice-signatures">
                    <div className="invoice-signature">
                      <div className="invoice-signature-line">Customer Signature</div>
                    </div>
                    <div className="invoice-signature">
                      <div className="invoice-signature-line">
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="no-print flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review booking before printing
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintBooking}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <Printer size={18} />
                  Print Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
