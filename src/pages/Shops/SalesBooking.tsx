// src/pages/Shops/SalesBooking.tsx - Sales Booking/Order Management
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, orderBy, limit, doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import toast from "react-hot-toast";
import { Calendar, Phone, Package, Plus, Trash2, Save, FileText, Printer, Download, ShoppingCart, Scan, Search, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { numberToWords } from "../../utils/numberToWords";
import { createPrintHTML, printDocument } from "../../utils/printUtils";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import BarcodeScanner from "../../components/common/BarcodeScanner";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import { getItemByBarcode } from "../../firebase/warehouseItems";
import { createBookingLedgerEntry } from "../../firebase/ledger";
import { useShop, BookingItem as ShopBookingItem, BranchName } from "../../context/ShopContext";
import { getGSTSettings, GSTSettings, calculateGST, getAppSettings } from "../../firebase/settings";
import { getAllActiveSalespersons, addSalesperson, deleteSalesperson, Salesperson } from "../../firebase/salespersons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const DEFAULT_BRANCHES = ["Miraj", "Sangli", "Ichalkaranji", "Tasgaon"];

interface BookingItem {
  id: string;
  itemName?: string;
  category?: string;
  subcategory?: string;
  weight?: string;
  type?: string;
  location?: string;
  sellingPrice?: number;
  discount?: number;
  taxableAmount?: number;
  barcode?: string;
  costPrice?: number;
  shopStockId?: string;
  warehouseItemId?: string;
  stoneSapphire?: string;
  trNo?: string;
  pieces?: number;
  total?: number;
}

interface SavedBooking {
  id: string;
  bookingNo: string;
  partyName: string;
  mobileNo: string;
  branch: string;
  salespersonName: string;
  items: BookingItem[];
  netAmount: number;
  cashAdvance: number;
  pendingAmount: number;
  remarks: string;
  createdAt: string;
  deliveryDate?: string;
  totalAmount?: number;
  status?: string;
}

export default function SalesBooking() {
  const { user, userProfile } = useAuth();
  const { branchStockCache, setBranchStockCache, currentBooking, updateBooking, clearBooking } = useShop();
  const navigate = useNavigate();

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

  // History - Enhanced for multiple bookings
  const [showHistory, setShowHistory] = useState(false);
  const [lastBooking, setLastBooking] = useState<SavedBooking | null>(null);
  const [recentBookings, setRecentBookings] = useState<SavedBooking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Saved Data context
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
        itemName: stockItem.category || warehouseItem?.category || "Unknown", // Add itemName for display
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
    const taxable = (item.sellingPrice || 0) - (item.discount || 0);
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
        deliveryDate: deliveryDate || "",
        salespersonName,
        items: bookingItems.map((item) => ({
          barcode: item.barcode || "",
          itemName: item.itemName || "",
          category: item.category || "",
          subcategory: item.subcategory || "",
          weight: item.weight || "",
          type: item.type || "",
          location: item.location || "",
          sellingPrice: item.sellingPrice || 0,
          discount: item.discount || 0,
          taxableAmount: item.taxableAmount || 0,
          stoneSapphire: item.stoneSapphire || "",
          trNo: item.trNo || "",
          pieces: item.pieces || 0,
          total: item.total || 0,
        })),
        netAmount: netAmount || 0,
        cashAdvance: cashAdvance || 0,
        totalAmount: totalAmount || 0,
        pendingAmount: pendingAmount || 0,
        remarks: remarks || "",
        status: "pending",
        createdAt: new Date().toISOString(),
        createdBy: user?.email || userProfile?.displayName || "unknown",
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
          user?.email || userProfile?.displayName || "unknown"
        );
        console.log("✅ Ledger entry created for booking");
      } catch (ledgerError) {
        console.error("Error creating ledger entry:", ledgerError);
        // Don't fail the booking if ledger fails
        toast("⚠️ Booking saved but ledger entry failed", { duration: 3000 });
      }

      // Update stock status for all booked items
      try {
        let updatedCount = 0;
        for (const item of bookingItems) {
          try {
            let stockDocId = item.shopStockId;

            // If no shopStockId, try to find by barcode
            if (!stockDocId && item.barcode) {
              const stockQuery = query(
                collection(db, "shops", selectedBranch, "stock"),
                where("barcode", "==", item.barcode)
              );
              const stockSnapshot = await getDocs(stockQuery);
              if (!stockSnapshot.empty) {
                stockDocId = stockSnapshot.docs[0].id;
              }
            }

            if (stockDocId) {
              const stockRef = doc(db, "shops", selectedBranch, "stock", stockDocId);
              await setDoc(stockRef, {
                status: "booked",
                bookedBy: bookingId,
                bookedAt: new Date().toISOString(),
              }, { merge: true });
              updatedCount++;
              console.log(`✅ Updated stock status for item: ${item.barcode || item.itemName}`);
            } else {
              console.warn(`⚠️ Could not find stock document for item: ${item.barcode || item.itemName}`);
            }
          } catch (itemError) {
            console.error(`Error updating stock for item ${item.barcode}:`, itemError);
          }
        }
        console.log(`✅ Stock status updated for ${updatedCount}/${bookingItems.length} items`);
        if (updatedCount < bookingItems.length) {
          toast(`⚠️ ${updatedCount}/${bookingItems.length} items updated`, { duration: 3000 });
        }
      } catch (stockError) {
        console.error("Error updating stock status:", stockError);
        toast("⚠️ Booking saved but stock status update failed", { duration: 3000 });
      }

      // Save booking data for context or further actions if needed
      setSavedBookingData({
        id: bookingId,
        bookingNo,
        branch: selectedBranch,
        partyName,
        mobileNo,
        deliveryDate: deliveryDate || "",
        salespersonName,
        items: bookingItems,
        totalAmount: totalAmount || 0,
        netAmount: netAmount || 0,
        cashAdvance: cashAdvance || 0,
        pendingAmount: pendingAmount || 0,
        remarks: remarks || "",
        createdAt: new Date().toISOString(),
      });

      // Refresh branch stock to reflect updated statuses
      await loadBranchStock();

      // Clear booking items after successful save
      setBookingItems([]);
      setPartyName("");
      setMobileNo("");
      setDeliveryDate("");
      setRemarks("");
      setCashAdvance(0);

      // Instead of an incomplete modal, just confirm success
      toast.success(`Booking ${bookingNo} saved successfully!`);

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

    // Calculate GST if not in saved data
    const netAmountVal = savedBookingData.netAmount || 0;
    const gstRateVal = gstSettings?.cgst || 1.5;
    const cgstVal = (netAmountVal * gstRateVal) / 100;
    const sgstVal = (netAmountVal * gstRateVal) / 100;
    const totalWithGSTVal = netAmountVal + cgstVal + sgstVal;

    const itemsHtml = savedBookingData.items.map((item: any, idx: number) => {
      const itemTaxable = (item.sellingPrice || 0) - (item.discount || 0);
      return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${item.category || item.itemName || ''}</td>
        <td class="text-center">7103</td>
        <td>${item.subcategory || ''}</td>
        <td class="text-center">${item.location || ''}</td>
        <td class="text-center">1</td>
        <td class="text-right">${item.weight || ''}</td>
        <td class="text-center">${item.type || ''}</td>
        <td class="text-right">${fmt(item.sellingPrice || 0)}</td>
        <td class="text-right">${fmt(item.discount || 0)}</td>
        <td class="text-right font-bold">${fmt(item.taxableAmount || itemTaxable)}</td>
      </tr>
    `;
    }).join('');

    const html = `
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
          <p><strong>Location:</strong> ${savedBookingData.branch}</p>
        </div>
        <div class="bill-info-right">
          <p><strong>Bill Date:</strong> ${dateStr}</p>
          <p><strong>Bill No:</strong> ${savedBookingData.bookingNo || savedBookingData.bookingId}</p>
        </div>
      </div>
      
      <!-- Party Details Box -->
      <div class="party-box">
        <p><strong>Party Name:</strong> ${savedBookingData.partyName}</p>
        <p><strong>Mo:</strong> ${savedBookingData.mobileNo || ''}</p>
        <p><strong>Emp Name:</strong> ${savedBookingData.salespersonName || 'N/A'}</p>
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
          ${itemsHtml}
          ${Array(Math.max(0, 8 - savedBookingData.items.length)).fill(0).map(() => `
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
          <p style="margin-bottom: 25px; font-weight: bold;">Rupees: ${numberToWords(totalWithGSTVal)}</p>
          <div style="font-size: 10px; line-height: 1.8;">
            <p><strong>GST No:</strong> ${companySettings?.companyGSTIN || "27AANCS1421M1Z3"}</p>
            <p><strong>State:</strong> Maharashtra</p>
            <p style="margin-top: 10px;"><strong>Remarks:</strong> ${savedBookingData.remarks || '-'}</p>
          </div>
        </div>
        
        <!-- Right Side -->
        <div class="totals-right">
          <table>
            <tr>
              <td>Net Amount:</td>
              <td class="text-right">${fmt(netAmountVal)}</td>
            </tr>
            ${gstType === "cgst_sgst" ? `
              <tr>
                <td>SGST ${gstSettings?.sgst || 1.5}%:</td>
                <td class="text-right">${fmt(sgstVal)}</td>
              </tr>
              <tr>
                <td>CGST ${gstSettings?.cgst || 1.5}%:</td>
                <td class="text-right">${fmt(cgstVal)}</td>
              </tr>
            ` : `
              <tr>
                <td>IGST ${gstSettings?.igst || 3}%:</td>
                <td class="text-right">${fmt(cgstVal + sgstVal)}</td>
              </tr>
            `}
            <tr class="total-row">
              <td>Bill Amount:</td>
              <td class="text-right">${fmt(totalWithGSTVal)}</td>
            </tr>
            <tr>
              <td>Advance Amt:</td>
              <td class="text-right">${fmt(savedBookingData.cashAdvance)}</td>
            </tr>
            <tr>
              <td>Cash Amount:</td>
              <td class="text-right">${fmt(savedBookingData.cashAdvance)}</td>
            </tr>
            <tr class="total-row">
              <td>Bill Outstanding:</td>
              <td class="text-right"><strong>${fmt(savedBookingData.pendingAmount || (totalWithGSTVal - savedBookingData.cashAdvance))}</strong></td>
            </tr>
          </table>
        </div>
      </div>
      
      <!-- Footer / Signature -->
      <div class="signature-area">
        <p>For: ${companySettings?.companyName || "Mangal-Murthi Jewelry Store"}</p>
        <div class="sig-line">Authorized Signatory</div>
      </div>
    `;

    const printHTML = createPrintHTML({
      title: `Booking - ${savedBookingData.partyName}`,
      styles: `
        body { font-family: 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif; color: #000; }
        .invoice-header { text-align: center; padding-bottom: 8px; margin-bottom: 0; }
        .invoice-header h1 { font-size: 24px; font-weight: bold; margin: 0 0 4px 0; text-transform: none; }
        .invoice-header p { margin: 2px 0; font-size: 11px; color: #333; }
        .top-meta { display: flex; justify-content: center; align-items: center; position: relative; margin-top: 10px; margin-bottom: 12px; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 8px 0; }
        .sales-book-title { font-weight: bold; font-size: 14px; }
        .original-tag { position: absolute; right: 0; font-weight: bold; text-transform: uppercase; font-size: 11px; }
        .bill-info-container { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; }
        .bill-info-left { width: 50%; }
        .bill-info-right { width: 50%; text-align: right; }
        .bill-info-right p { margin: 2px 0; }
        .party-box { border: 1px solid #000; padding: 10px 15px; margin-bottom: 15px; font-size: 12px; min-height: 70px; }
        .party-box p { margin: 5px 0; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
        .items-table th { border: 1px solid #000; background-color: #f2f2f2; padding: 8px 4px; text-align: center; font-weight: bold; font-size: 10px; text-transform: uppercase; }
        .items-table td { border: 1px solid #000; padding: 6px 4px; height: 24px; }
        .totals-container { display: flex; justify-content: space-between; font-size: 12px; margin-top: 10px; }
        .totals-left { width: 55%; }
        .totals-right { width: 42%; border: 1px solid #000; }
        .totals-right table { width: 100%; border-collapse: collapse; }
        .totals-right td { padding: 5px 10px; border-bottom: 1px solid #eee; }
        .totals-right tr:last-child td { border-bottom: none; }
        .total-row { font-weight: bold; background-color: #f9f9f9; border-top: 1.5px solid #000; }
        .signature-area { margin-top: 50px; text-align: right; font-size: 11px; }
        .sig-line { margin-top: 45px; border-top: 1px solid #000; width: 220px; display: inline-block; text-align: center; padding-top: 6px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      `,
      bodyContent: html
    });

    printDocument(printHTML);
  };

  // Load recent bookings with enhanced tracking
  const loadRecentBookings = async () => {
    setLoadingHistory(true);
    try {
      const bookingsRef = collection(db, "shops", selectedBranch, "bookings");
      const q = query(bookingsRef, orderBy("createdAt", "desc"), limit(10));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const bookings: SavedBooking[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SavedBooking));

        setRecentBookings(bookings);
        setLastBooking(bookings[0]); // Set most recent as last booking
        setShowHistory(true);

        // Calculate total pending across all bookings
        const totalPending = bookings.reduce((sum, booking) =>
          sum + (booking.pendingAmount || 0), 0
        );

        toast.success(`Loaded ${bookings.length} recent bookings. Total pending: ₹${totalPending.toFixed(2)}`);
      } else {
        toast("No previous bookings found");
        setRecentBookings([]);
        setLastBooking(null);
      }
    } catch (error) {
      console.error("Error loading booking history:", error);
      toast.error("Failed to load booking history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Auto-load recent bookings on mount and branch change
  useEffect(() => {
    loadRecentBookings();
  }, [selectedBranch]);

  // Export to Excel
  const exportToExcel = () => {
    if (bookingItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Booking Details Sheet
    const bookingDetails = [
      { Field: "Booking Information", Value: "" },
      { Field: "Branch", Value: selectedBranch },
      { Field: "Party Name", Value: partyName },
      { Field: "Mobile No", Value: mobileNo },
      { Field: "Delivery Date", Value: deliveryDate },
      { Field: "Salesperson", Value: salespersonName },
      { Field: "Created Date", Value: new Date().toLocaleDateString() },
      {},
      { Field: "Financial Summary", Value: "" },
      { Field: "Items Total", Value: `₹${totalAmount.toFixed(2)}` },
      { Field: "Net Amount", Value: `₹${netAmount.toFixed(2)}` },
      { Field: "Cash Advance", Value: `₹${cashAdvance.toFixed(2)}` },
      { Field: "Pending Amount", Value: `₹${pendingAmount.toFixed(2)}` },
      {},
      { Field: "Remarks", Value: remarks || "-" },
    ];
    const detailsSheet = XLSX.utils.json_to_sheet(bookingDetails);
    XLSX.utils.book_append_sheet(workbook, detailsSheet, "Booking Details");

    // Items Sheet - Alphabetically ordered columns
    const itemsData = bookingItems.map((item, idx) => ({
      "S.No": idx + 1,
      "Barcode": item.barcode || "-",
      "Category": item.category || item.itemName || "-",
      "Discount (₹)": (item.discount || 0).toFixed(2),
      "HSN": "7103",
      "Location": item.location || "-",
      "Pieces": 1,
      "Rate (₹)": (item.sellingPrice || 0).toFixed(2),
      "Remark": item.subcategory || "-",
      "Taxable Amount (₹)": (item.taxableAmount || 0).toFixed(2),
      "Type": item.type || "-",
      "Weight (gm)": item.weight || "-",
    }));

    // Add totals row
    itemsData.push({
      "S.No": "",
      "Barcode": "",
      "Category": "",
      "Discount (₹)": "",
      "HSN": "",
      "Location": "",
      "Pieces": "",
      "Rate (₹)": "",
      "Remark": "TOTAL",
      "Taxable Amount (₹)": netAmount.toFixed(2),
      "Type": "",
      "Weight (gm)": "",
    } as any);

    const itemsSheet = XLSX.utils.json_to_sheet(itemsData);

    // Set column widths
    itemsSheet['!cols'] = [
      { wch: 6 },  // S.No
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
    const filename = `Booking_${partyName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success("Excel exported successfully!");
  };

  // Export to PDF - Standardized Professional Format
  const exportToPDF = () => {
    if (bookingItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const bookingNo = `BKG-${Date.now().toString().slice(-6)}`;
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
    doc.text(`Bill No: ${bookingNo}`, pageWidth - 14, 53, { align: "right" });

    // Party Details Box
    doc.setDrawColor(0);
    doc.rect(14, 58, pageWidth - 28, 20);
    doc.text(`Party Name: ${partyName || "Walk-in Customer"}`, 18, 63);
    doc.text(`Mo: ${mobileNo || "N/A"}`, 18, 68);
    doc.text(`Emp Name: ${salespersonName || "N/A"}`, 18, 73);

    // Table
    const tableData = bookingItems.map((item, idx) => [
      idx + 1,
      item.category || "-",
      "7103",
      item.subcategory || "-",
      item.location || "-",
      1,
      item.weight || "-",
      item.type || "-",
      (item.sellingPrice || 0).toFixed(2),
      (item.discount || 0).toFixed(2),
      (item.taxableAmount || 0).toFixed(2),
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
    doc.text(`Rupees: ${numberToWords(totals.grandTotal)}`, 14, finalY);

    // Small footer left
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`GST No: ${companySettings?.companyGSTIN || "27AANCS1421M1Z3"}`, 14, finalY + 15);
    doc.text(`State: Maharashtra`, 14, finalY + 20);
    if (remarks) doc.text(`Remarks: ${remarks}`, 14, finalY + 25);

    // Totals Box Right
    const totalsX = pageWidth - 80;
    doc.rect(totalsX, finalY - 5, 66, 45);

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

    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Cash Advance:`, totalsX + 2, currentY);
    doc.text(`${(cashAdvance || 0).toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });

    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`Outstanding:`, totalsX + 2, currentY);
    doc.setTextColor(220, 0, 0);
    doc.text(`${(pendingAmount || 0).toFixed(2)}`, pageWidth - 16, currentY, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Signature
    doc.setFontSize(9);
    doc.text(`For: ${compName}`, pageWidth - 14, currentY + 20, { align: "right" });
    doc.line(pageWidth - 60, currentY + 35, pageWidth - 14, currentY + 35);
    doc.text(`Authorized Signatory`, pageWidth - 37, currentY + 40, { align: "center" });

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
                onClick={loadRecentBookings}
                disabled={loadingHistory}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={16} /> {loadingHistory ? "Loading..." : "Recent Bookings"}
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

            {/* Save & Clear Buttons */}
            {bookingItems.length > 0 && (
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear the current booking?")) {
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
                      toast.success("Booking cleared");
                    }
                  }}
                  className="px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-3 disabled:opacity-50"
                  disabled={loading}
                >
                  <Trash2 size={24} />
                  Clear Booking
                </button>
                <button
                  onClick={handleSaveBooking}
                  disabled={loading}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Save size={24} />
                  {loading ? "Saving..." : "Save Booking"}
                </button>
              </div>
            )}

            {/* Recent Bookings History */}
            {showHistory && recentBookings.length > 0 && (
              <div className="mt-6 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300">
                    📜 Recent Bookings History
                  </h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Bookings List */}
                <div className="space-y-3 mb-4">
                  {recentBookings.map((booking, index) => (
                    <div
                      key={booking.id}
                      onClick={() => setLastBooking(booking)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${lastBooking?.id === booking.id
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/40"
                        : "border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 hover:border-purple-400"
                        }`}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs">Booking No:</span>
                          <p className="font-semibold">{booking.bookingNo}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs">Party:</span>
                          <p className="font-semibold">{booking.partyName}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs">Date:</span>
                          <p className="font-semibold">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs">Net Amount:</span>
                          <p className="font-semibold">₹{booking.netAmount?.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 text-xs">Pending:</span>
                          <p className={`font-bold ${(booking.pendingAmount || 0) > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                            }`}>
                            ₹{booking.pendingAmount?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Booking Details */}
                {lastBooking && (
                  <div className="border-t-2 border-purple-300 dark:border-purple-700 pt-4">
                    <h4 className="font-bold text-purple-900 dark:text-purple-300 mb-3">
                      Selected Booking Details
                    </h4>

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
                        <p className="font-semibold">{lastBooking.deliveryDate || "N/A"}</p>
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
                            {lastBooking.status || "completed"}
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
                            <th className="p-2">HSN</th>
                            <th className="p-2">Remark</th>
                            <th className="p-2">Loct</th>
                            <th className="p-2">Pcs</th>
                            <th className="p-2">Weight</th>
                            <th className="p-2">Type</th>
                            <th className="p-2">Rate</th>
                            <th className="p-2">Disc</th>
                            <th className="p-2">Taxable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastBooking.items?.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-purple-200 dark:border-purple-800">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2">{item.category || item.itemName || "-"}</td>
                              <td className="p-2">7103</td>
                              <td className="p-2">{item.subcategory || "-"}</td>
                              <td className="p-2">{item.location || "-"}</td>
                              <td className="p-2 text-center">1</td>
                              <td className="p-2 text-right">{item.weight || "-"}</td>
                              <td className="p-2 text-center">{item.type || "-"}</td>
                              <td className="p-2 text-right">₹{(item.sellingPrice || 0).toFixed(2)}</td>
                              <td className="p-2 text-right">₹{(item.discount || 0).toFixed(2)}</td>
                              <td className="p-2 text-right font-semibold">₹{(item.taxableAmount || 0).toFixed(2)}</td>
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

                    {/* Action Buttons for Selected Booking */}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => {
                          // Load this booking into the form
                          setPartyName(lastBooking.partyName);
                          setMobileNo(lastBooking.mobileNo);
                          setSalespersonName(lastBooking.salespersonName);
                          setRemarks(lastBooking.remarks);
                          toast.success("Booking loaded into form");
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Load to Form
                      </button>
                      <button
                        onClick={() => {
                          setSavedBookingData(lastBooking);
                          setTimeout(() => handlePrintBooking(), 100);
                        }}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Printer size={16} /> Print
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TASection>
        </div>
      </div>

    </>
  );
}
