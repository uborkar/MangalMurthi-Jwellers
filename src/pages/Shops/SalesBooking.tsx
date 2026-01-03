// src/pages/Shops/SalesBooking.tsx - Sales Booking/Order Management
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Calendar, User, Phone, Package, Plus, Trash2, Save, FileText, Printer, Download, ShoppingCart } from "lucide-react";
import { doc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import BarcodeScanner from "../../components/common/BarcodeScanner";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import { getItemByBarcode } from "../../firebase/warehouseItems";
import { createBookingLedgerEntry } from "../../firebase/ledger";
import { useShop } from "../../context/ShopContext";

type BranchName = "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";

interface BookingItem {
  id: string;
  barcode?: string;
  itemName: string;
  stoneSapphire: string; // Stone/Sapphire details
  trNo: string; // Transfer Number
  pieces: number;
  weight: string;
  total: number;
}

const BRANCHES: BranchName[] = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];

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
  const [netAmount, setNetAmount] = useState(currentBooking.netAmount);
  const [cashAdvance, setCashAdvance] = useState(currentBooking.cashAdvance);
  const [pendingAmount, setPendingAmount] = useState(currentBooking.pendingAmount);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Additional Info
  const [remarks, setRemarks] = useState(currentBooking.remarks);
  
  // History
  const [showHistory, setShowHistory] = useState(false);
  const [lastBooking, setLastBooking] = useState<any>(null);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [savedBookingData, setSavedBookingData] = useState<any>(null);

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

      // Add to booking
      const newItem: BookingItem = {
        id: crypto.randomUUID(),
        barcode: barcode,
        itemName: stockItem.category || warehouseItem?.category || "Unknown",
        stoneSapphire: stockItem.subcategory || warehouseItem?.subcategory || "",
        trNo: "",
        pieces: 1,
        weight: String(stockItem.weight || warehouseItem?.weight || "0"),
        total: parseFloat(String(stockItem.weight || warehouseItem?.weight || "0")) * 1,
      };

      setBookingItems((prev) => [...prev, newItem]);
      calculateTotals();
      toast.success(`✅ Added: ${barcode}`);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      toast.error("Failed to process barcode");
    }
  };

  // Add new item to booking
  const addBookingItem = () => {
    const newItem: BookingItem = {
      id: crypto.randomUUID(),
      barcode: "",
      itemName: "",
      stoneSapphire: "",
      trNo: "",
      pieces: 1,
      weight: "",
      total: 0,
    };
    setBookingItems([...bookingItems, newItem]);
  };

  // Update item field
  const updateItem = (id: string, field: keyof BookingItem, value: any) => {
    setBookingItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        
        // Auto-calculate total if pieces or weight changes
        if (field === "pieces" || field === "weight") {
          const weight = parseFloat(updated.weight) || 0;
          updated.total = updated.pieces * weight;
        }
        
        return updated;
      })
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setBookingItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculate totals
  const calculateTotals = () => {
    const total = bookingItems.reduce((sum, item) => sum + item.total, 0);
    setTotalAmount(total);
    setPendingAmount(total - cashAdvance);
  };

  // Update totals when items or advance changes
  useState(() => {
    calculateTotals();
  });

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

  // Handle print from modal
  const handlePrintBooking = () => {
    setShowPreviewModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
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

  // Export to PDF
  const exportToPDF = () => {
    if (bookingItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("SALES BOOKING", 105, 15, { align: "center" });

    doc.setFontSize(11);
    doc.text(`Branch: ${selectedBranch}`, 14, 25);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Party Name: ${partyName}`, 14, 39);
    doc.text(`Mobile: ${mobileNo}`, 14, 46);
    doc.text(`Delivery Date: ${deliveryDate}`, 14, 53);
    doc.text(`Salesperson: ${salespersonName}`, 14, 60);

    // Table
    const tableData = bookingItems.map((item, idx) => [
      idx + 1,
      item.itemName,
      item.stoneSapphire,
      item.trNo,
      item.pieces,
      item.weight,
      item.total.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 67,
      head: [["#", "Item Name", "Stone/Sapphire", "Tr No", "Pcs", "Weight", "Total"]],
      body: tableData,
      theme: "grid",
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Items Total: ₹${totalAmount.toFixed(2)}`, 140, finalY);
    doc.text(`Net Amount: ₹${netAmount.toFixed(2)}`, 140, finalY + 7);
    doc.text(`Cash Advance: ₹${cashAdvance.toFixed(2)}`, 140, finalY + 14);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Pending Amount: ₹${pendingAmount.toFixed(2)}`, 140, finalY + 24);

    if (remarks) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Remarks: ${remarks}`, 14, finalY + 35);
    }

    doc.save(`Booking_${partyName}_${Date.now()}.pdf`);
    toast.success("PDF exported");
  };

  // Print booking
  const handlePrint = () => {
    if (bookingItems.length === 0) {
      toast.error("No items to print");
      return;
    }

    window.print();
  };

  return (
    <>
      <PageMeta
        title="Sales Booking - Order Management"
        description="Create and manage customer orders and bookings"
      />

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
                  <User className="inline mr-1" size={14} />
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

            {/* Salesperson & Barcode Scanner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                  🔍 Scan Item Barcode
                </label>
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  placeholder="Scan barcode to add item from stock..."
                  disabled={loading}
                />
              </div>
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
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 dark:border-gray-700">
                      <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50">SNO</th>
                      <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50">ITEM NAME *</th>
                      <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50">STONE/SAPPHIRE</th>
                      <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50">TR NO</th>
                      <th className="p-3 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50">PCS</th>
                      <th className="p-3 text-right font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50">WEIGHT *</th>
                      <th className="p-3 text-right font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50">TOTAL</th>
                      <th className="p-3 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50 no-print">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3 font-medium text-gray-700 dark:text-gray-300">{idx + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                            placeholder="Enter item name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.stoneSapphire}
                            onChange={(e) => updateItem(item.id, "stoneSapphire", e.target.value)}
                            placeholder="Stone/Sapphire details"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.trNo}
                            onChange={(e) => updateItem(item.id, "trNo", e.target.value)}
                            placeholder="Tr No"
                            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={item.pieces}
                            onChange={(e) => {
                              updateItem(item.id, "pieces", Number(e.target.value));
                              calculateTotals();
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                            min="1"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.weight}
                            onChange={(e) => {
                              updateItem(item.id, "weight", e.target.value);
                              calculateTotals();
                            }}
                            placeholder="0.00"
                            className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">
                          {item.total.toFixed(2)}
                        </td>
                        <td className="p-3 text-center no-print">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {bookingItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <Package size={48} className="mx-auto mb-2 opacity-50" />
                          <p>No items added. Scan barcode or click "Add Item" to start.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  
                  {/* Totals Footer */}
                  {bookingItems.length > 0 && (
                    <tfoot className="border-t-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <td colSpan={6} className="p-3 text-right font-bold text-gray-700 dark:text-gray-300">
                          TOTAL AMOUNT:
                        </td>
                        <td className="p-3 text-right font-bold text-lg text-primary">
                          ₹{totalAmount.toFixed(2)}
                        </td>
                        <td className="no-print"></td>
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
                    Net Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={netAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNetAmount(val);
                        setPendingAmount(val - cashAdvance);
                      }}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-3 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    Final agreed amount with customer
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
                        setPendingAmount(netAmount - val);
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
                    Pending Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={pendingAmount}
                      readOnly
                      className="w-full pl-8 pr-3 py-3 border-2 border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-gray-900 dark:text-white text-lg font-semibold cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                    Balance to be collected
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
                      <span className={`px-2 py-1 rounded text-xs ${
                        lastBooking.status === "pending" 
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
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
                    <div className="invoice-totals-value">₹{savedBookingData.netAmount.toFixed(2)}</div>
                  </div>
                  <div className="invoice-totals-row">
                    <div className="invoice-totals-label">Cash Advance:</div>
                    <div className="invoice-totals-value">₹{savedBookingData.cashAdvance.toFixed(2)}</div>
                  </div>
                  <div className="invoice-totals-row total">
                    <div className="invoice-totals-label">Pending Amount:</div>
                    <div className="invoice-totals-value">₹{savedBookingData.pendingAmount.toFixed(2)}</div>
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
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
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
