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
  const [selectedBranch, setSelectedBranch] = useState<BranchName>("Sangli");
  
  // Customer Details
  const [partyName, setPartyName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  
  // Salesperson
  const [salespersonName, setSalespersonName] = useState("");
  
  // Booking Items
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
  
  // Branch Stock
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Payment Details
  const [netAmount, setNetAmount] = useState(0); // User enters this
  const [cashAdvance, setCashAdvance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0); // Calculated from items
  
  // Additional Info
  const [remarks, setRemarks] = useState("");
  
  // History
  const [showHistory, setShowHistory] = useState(false);
  const [lastBooking, setLastBooking] = useState<any>(null);

  // Load branch stock
  useEffect(() => {
    loadBranchStock();
  }, [selectedBranch]);

  const loadBranchStock = async () => {
    setLoading(true);
    try {
      const stock = await getShopStock(selectedBranch);
      // Filter only available items
      const available = stock.filter((s) => s.status === "in-branch");
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

      // Reset form
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
    } catch (error) {
      console.error("Error saving booking:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to save booking");
    } finally {
      setLoading(false);
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

              {/* Print Header (only visible when printing) */}
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold text-center mb-4">SALES BOOKING</h1>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p><strong>Branch:</strong> {selectedBranch}</p>
                    <p><strong>Party Name:</strong> {partyName}</p>
                    <p><strong>Mobile:</strong> {mobileNo}</p>
                  </div>
                  <div>
                    <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    <p><strong>Delivery Date:</strong> {deliveryDate}</p>
                    <p><strong>Salesperson:</strong> {salespersonName}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                      <th className="p-3">SNO</th>
                      <th className="p-3">Item Name *</th>
                      <th className="p-3">Stone/Sapphire</th>
                      <th className="p-3">Tr No</th>
                      <th className="p-3">Pcs</th>
                      <th className="p-3">Weight *</th>
                      <th className="p-3">Total</th>
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
                            value={item.itemName}
                            onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                            placeholder="Item name"
                            className="w-full px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.stoneSapphire}
                            onChange={(e) => updateItem(item.id, "stoneSapphire", e.target.value)}
                            placeholder="Stone/Sapphire"
                            className="w-full px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.trNo}
                            onChange={(e) => updateItem(item.id, "trNo", e.target.value)}
                            placeholder="Tr No"
                            className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={item.pieces}
                            onChange={(e) => {
                              updateItem(item.id, "pieces", Number(e.target.value));
                              calculateTotals();
                            }}
                            className="w-16 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
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
                            placeholder="Weight"
                            className="w-20 px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
                          />
                        </td>
                        <td className="p-3 font-semibold">{item.total.toFixed(2)}</td>
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

                    {bookingItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          <Package size={48} className="mx-auto mb-2 opacity-50" />
                          <p>No items added. Scan barcode or click "Add Item" to start.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Print Footer (only visible when printing) */}
              {bookingItems.length > 0 && (
                <div className="hidden print:block mt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                    <div></div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Items Total:</span>
                        <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Net Amount:</span>
                        <span className="font-semibold">₹{netAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Cash Advance:</span>
                        <span className="font-semibold text-green-600">₹{cashAdvance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-bold">Pending Amount:</span>
                        <span className="font-bold text-red-600">₹{pendingAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  {remarks && (
                    <div className="mt-4 p-3 border rounded">
                      <p className="text-xs font-semibold">Remarks:</p>
                      <p className="text-sm">{remarks}</p>
                    </div>
                  )}
                  <div className="mt-8 grid grid-cols-2 gap-8">
                    <div className="text-center border-t pt-2">
                      <p className="text-sm">Customer Signature</p>
                    </div>
                    <div className="text-center border-t pt-2">
                      <p className="text-sm">Authorized Signature</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Details */}
            {bookingItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 no-print">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    Additional Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter any additional notes or special instructions..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Items Total:</span>
                      <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Net Amount:</span>
                      <input
                        type="number"
                        value={netAmount}
                        onChange={(e) => {
                          const net = Number(e.target.value);
                          setNetAmount(net);
                          setPendingAmount(net - cashAdvance);
                        }}
                        className="w-32 px-3 py-1 border rounded text-right dark:bg-gray-800 dark:border-gray-700"
                        min="0"
                        placeholder="Enter amount"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Cash Advance:</span>
                      <input
                        type="number"
                        value={cashAdvance}
                        onChange={(e) => {
                          const advance = Number(e.target.value);
                          setCashAdvance(advance);
                          setPendingAmount(netAmount - advance);
                        }}
                        className="w-32 px-3 py-1 border rounded text-right dark:bg-gray-800 dark:border-gray-700"
                        min="0"
                        max={netAmount}
                      />
                    </div>

                    <div className="border-t border-gray-300 dark:border-gray-700 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 dark:text-white">Pending Amt:</span>
                        <span className="font-bold text-xl text-red-600 dark:text-red-400">
                          ₹{pendingAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleSaveBooking}
                      disabled={loading || bookingItems.length === 0}
                      className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={18} />
                      {loading ? "Saving..." : "Save Booking"}
                    </button>
                  </div>
                </div>
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
