// src/pages/Shops/Billing.tsx
import React, { useEffect, useMemo, useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import { PlusCircle, Trash2, Download, Printer } from "lucide-react";
import toast from "react-hot-toast";
import {
  BranchStockItem,
  getShopStock,
} from "../../firebase/shopStock";
import { saveInvoice } from "../../firebase/invoices";
import { markBranchItemSold } from "../../firebase/branchStock";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Billing.tsx (Hybrid Jewellery POS)
 *
 * HYBRID PRICING:
 *  - If pricingMode === "weight" and goldRate + weight exist:
 *      price = (goldRate * weightG) + stoneCharge + makingCharge + profitOnGold
 *      profitOnGold = (goldRate * weightG * profitPercent / 100)
 *  - Else (fallback "type"):
 *      price = typeAmount + makingCharge + (typeAmount * profitPercent / 100)
 *
 * TAX:
 *  - Discount is per line (₹)
 *  - Taxable = (price * qty) - discount
 *  - GST_RATE (e.g. 3%) is applied on taxable
 *  - CGST = GST/2, SGST = GST/2
 */

type BranchName = "Sangli" | "Miraj" | "Kolhapur";

interface BillRow {
  id: string;
  stockItemId?: string; // Firestore doc id in shop stockitem
  label: string;
  productName?: string;
  branch: BranchName;
  typeAmount: number; // base / type price (if any)
  pricingMode: "weight" | "type";
  weightG: number;
  goldRate: number;
  making: number;
  stoneCharge: number;
  profitPercent: number;
  qty: number;
  price: number; // final unit price before tax
  discount: number;
  taxableAmount: number;
}

const GST_RATE = 3; // total (CGST+SGST)
const BRANCHES: BranchName[] = ["Sangli", "Miraj", "Kolhapur"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Map branch name to short code for "location" column
const BRANCH_CODE_MAP: Record<BranchName, string> = {
  Sangli: "SG",
  Miraj: "MJ",
  Kolhapur: "KL",
};

const Billing: React.FC = () => {
  // invoice-level
  const [selectedBranch, setSelectedBranch] = useState<BranchName>("Sangli");
  const [customerName, setCustomerName] = useState<string>("");
  const [salesman, setSalesman] = useState<string>("");

  // branch stock (available items at shop)
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSelected, setStockSelected] = useState<Record<string, boolean>>(
    {}
  );

  // bill rows
  const [rows, setRows] = useState<BillRow[]>([]);

  // -------------------------
  // FIRESTORE: Load branch stock
  // -------------------------
  useEffect(() => {
    async function load() {
      try {
        setStockLoading(true);
        const data = await getShopStock(selectedBranch);
        setBranchStock(data);
        setStockSelected({});
      } catch (err) {
        console.error(err);
        toast.error("Failed to load branch stock");
      } finally {
        setStockLoading(false);
      }
    }
    load();
  }, [selectedBranch]);

  // -------------------------
  // Pricing logic (Hybrid A+B)
  // -------------------------
  const computeUnitPrice = (row: {
    pricingMode: "weight" | "type";
    weightG: number;
    goldRate: number;
    stoneCharge: number;
    making: number;
    typeAmount: number;
    profitPercent: number;
  }): number => {
    const {
      pricingMode,
      weightG,
      goldRate,
      stoneCharge,
      making,
      typeAmount,
      profitPercent,
    } = row;

    // Weight-based model
    if (
      pricingMode === "weight" &&
      weightG > 0 &&
      goldRate > 0
    ) {
      const goldValue = goldRate * weightG;
      const profitOnGold = (goldValue * profitPercent) / 100;
      const total =
        goldValue + profitOnGold + (stoneCharge || 0) + (making || 0);
      return Number(total.toFixed(2));
    }

    // Type-based fallback
    const profitOnType = (typeAmount * profitPercent) / 100;
    const totalType = typeAmount + profitOnType + (making || 0);
    return Number(totalType.toFixed(2));
  };

  const recalcRow = (r: BillRow): BillRow => {
    const price = computeUnitPrice(r);
    const lineTotal = price * r.qty;
    const taxable = lineTotal - r.discount;
    return {
      ...r,
      price,
      taxableAmount: Number(Math.max(taxable, 0).toFixed(2)),
    };
  };

  // -------------------------
  // Add from stock selection
  // -------------------------

  const toggleStockSelect = (id: string) => {
    setStockSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const addSelectedStockToBill = () => {
    const chosen = branchStock.filter((s) => s.id && stockSelected[s.id]);
    if (!chosen.length) {
      toast("Select at least one stock item first", { icon: "⚠️" });
      return;
    }

    const newRows: BillRow[] = [];

    chosen.forEach((item) => {
      const pricingMode: "weight" | "type" =
        item.pricingMode || "type";

      const baseRow: BillRow = {
        id: uid(),
        stockItemId: item.id,
        label: item.label,
        productName: item.productName,
        branch: selectedBranch,
        pricingMode,
        weightG: Number(item.weightG || item.weight || 0),
        goldRate: Number(item.goldRate || 0),
        typeAmount: Number(item.typeAmount || item.basePrice || 0),
        making: Number(item.makingCharge || 0),
        stoneCharge: Number(item.stoneCharge || 0),
        profitPercent: Number(item.profitPercent || 0),
        qty: 1,
        price: 0,
        discount: 0,
        taxableAmount: 0,
      };

      const withCalc = recalcRow(baseRow);
      newRows.push(withCalc);
    });

    setRows((prev) => [...prev, ...newRows]);
    setStockSelected({});
    toast.success(`${chosen.length} item(s) added to bill`);
  };

  // -------------------------
  // Manual row updates
  // -------------------------
  const updateRowField = <K extends keyof BillRow>(
    rowId: string,
    field: K,
    value: BillRow[K]
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated: BillRow = { ...r, [field]: value };
        return recalcRow(updated);
      })
    );
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const addBlankRow = () => {
    const base: BillRow = {
      id: uid(),
      stockItemId: undefined,
      label: "",
      productName: "",
      branch: selectedBranch,
      pricingMode: "type",
      weightG: 0,
      goldRate: 0,
      typeAmount: 0,
      making: 0,
      stoneCharge: 0,
      profitPercent: 0,
      qty: 1,
      price: 0,
      discount: 0,
      taxableAmount: 0,
    };
    setRows((prev) => [...prev, base]);
  };

  // -------------------------
  // Totals & taxes
  // -------------------------
  const totals = useMemo(() => {
    const subtotal = rows.reduce(
      (s, r) => s + r.price * r.qty,
      0
    );
    const totalDiscount = rows.reduce((s, r) => s + r.discount, 0);
    const taxable = rows.reduce(
      (s, r) => s + r.taxableAmount,
      0
    );

    const gstTotal = Number(((taxable * GST_RATE) / 100).toFixed(2));
    const cgst = Number((gstTotal / 2).toFixed(2));
    const sgst = Number((gstTotal / 2).toFixed(2));
    const grandTotal = Number((taxable + gstTotal).toFixed(2));

    return {
      subtotal,
      totalDiscount,
      taxable,
      gstTotal,
      cgst,
      sgst,
      grandTotal,
    };
  }, [rows]);

  // -------------------------
  // Export Excel
  // -------------------------
  const handleExportExcel = () => {
    if (rows.length === 0) {
      toast.error("No items to export");
      return;
    }

    // Prepare data for Excel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const excelData: any[] = rows.map((row, idx) => ({
      "Sr No": idx + 1,
      "Label": row.label,
      "Product": row.productName || "-",
      "Location": BRANCH_CODE_MAP[row.branch] || row.branch,
      "Mode": row.pricingMode,
      "Weight (g)": row.weightG,
      "Gold Rate": row.goldRate,
      "Type/Base": row.typeAmount,
      "Making": row.making,
      "Stone": row.stoneCharge,
      "Profit %": row.profitPercent,
      "Qty": row.qty,
      "Price": row.price,
      "Discount": row.discount,
      "Taxable": row.taxableAmount,
    }));

    // Add totals row
    excelData.push({
      "Sr No": "",
      "Label": "",
      "Product": "",
      "Location": "",
      "Mode": "",
      "Weight (g)": "",
      "Gold Rate": "",
      "Type/Base": "",
      "Making": "",
      "Stone": "",
      "Profit %": "",
      "Qty": "",
      "Price": "SUBTOTAL",
      "Discount": totals.totalDiscount,
      "Taxable": totals.taxable,
    });

    excelData.push({
      "Sr No": "",
      "Label": "",
      "Product": "",
      "Location": "",
      "Mode": "",
      "Weight (g)": "",
      "Gold Rate": "",
      "Type/Base": "",
      "Making": "",
      "Stone": "",
      "Profit %": "",
      "Qty": "",
      "Price": `GST (${GST_RATE}%)`,
      "Discount": "",
      "Taxable": totals.gstTotal,
    });

    excelData.push({
      "Sr No": "",
      "Label": "",
      "Product": "",
      "Location": "",
      "Mode": "",
      "Weight (g)": "",
      "Gold Rate": "",
      "Type/Base": "",
      "Making": "",
      "Stone": "",
      "Profit %": "",
      "Qty": "",
      "Price": "GRAND TOTAL",
      "Discount": "",
      "Taxable": totals.grandTotal,
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");

    const fileName = `Invoice_${selectedBranch}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel file downloaded");
  };

  // -------------------------
  // Export PDF
  // -------------------------
  const handleExportInvoicePDF = () => {
    if (rows.length === 0) {
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
    
    if (customerName) {
      doc.text(`Customer: ${customerName}`, 14, 39);
    }
    if (salesman) {
      doc.text(`Salesman: ${salesman}`, 14, 46);
    }

    // Table data
    const tableData = rows.map((row, idx) => [
      idx + 1,
      row.label,
      row.productName || "-",
      row.pricingMode,
      row.weightG,
      row.qty,
      `₹${row.price.toFixed(2)}`,
      `₹${row.discount.toFixed(2)}`,
      `₹${row.taxableAmount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: customerName || salesman ? 52 : 39,
      head: [["#", "Label", "Product", "Mode", "Weight", "Qty", "Price", "Disc", "Taxable"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });

    // Get final Y position after table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(10);
    doc.text(`Subtotal: ₹${totals.subtotal.toFixed(2)}`, 140, finalY);
    doc.text(`Discount: ₹${totals.totalDiscount.toFixed(2)}`, 140, finalY + 7);
    doc.text(`Taxable: ₹${totals.taxable.toFixed(2)}`, 140, finalY + 14);
    doc.text(`CGST (${(GST_RATE / 2)}%): ₹${totals.cgst.toFixed(2)}`, 140, finalY + 21);
    doc.text(`SGST (${(GST_RATE / 2)}%): ₹${totals.sgst.toFixed(2)}`, 140, finalY + 28);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ₹${totals.grandTotal.toFixed(2)}`, 140, finalY + 38);

    const fileName = `Invoice_${selectedBranch}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded");
  };

  // -------------------------
  // Print
  // -------------------------
  const handlePrint = () => {
    if (rows.length === 0) {
      toast.error("No items to print");
      return;
    }
    window.print();
  };

  // -------------------------
  // Save Invoice (Firestore)
  // -------------------------
  const handleSaveInvoice = async () => {
    if (!rows.length) {
      toast.error("Add at least one item to bill");
      return;
    }

    const invoicePayload = {
      branch: selectedBranch,
      customerName: customerName || null,
      salesman: salesman || null,
      rows: rows.map((r) => ({
        stockItemId: r.stockItemId || null,
        label: r.label,
        productName: r.productName || "",
        branch: r.branch,
        pricingMode: r.pricingMode,
        weightG: r.weightG,
        goldRate: r.goldRate,
        typeAmount: r.typeAmount,
        making: r.making,
        stoneCharge: r.stoneCharge,
        profitPercent: r.profitPercent,
        qty: r.qty,
        price: r.price,
        discount: r.discount,
        taxableAmount: r.taxableAmount,
      })),
      totals,
      gstRate: GST_RATE,
      createdAt: new Date().toISOString(),
    };

    try {
      toast.loading("Saving invoice...");
      const invoiceId = await saveInvoice(selectedBranch, invoicePayload);

      // Mark related stock items as sold
      const sellOps: Promise<void>[] = [];
      rows.forEach((r) => {
        if (r.stockItemId) {
          sellOps.push(
            markBranchItemSold(selectedBranch, r.stockItemId, invoiceId)
          );
        }
      });

      await Promise.all(sellOps);

      toast.dismiss();
      toast.success("Invoice saved & items marked as sold");

      // reset
      setRows([]);
      setCustomerName("");
      setSalesman("");

      // refresh stock
      const refreshed = await getShopStock(selectedBranch);
      setBranchStock(refreshed);
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to save invoice");
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <>
      <PageMeta
        title="POS Billing - Branch"
        description="Create sales invoice from branch stock (Hybrid pricing)"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🧾 POS Billing (Jewellery)"
            subtitle="Select items from branch stock and generate GST-compliant invoice."
          >
            {/* Top controls: branch + export */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) =>
                    setSelectedBranch(e.target.value as BranchName)
                  }
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center gap-2 font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                >
                  <Download size={16} /> Excel
                </button>
                <button
                  onClick={handleExportInvoicePDF}
                  className="px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center gap-2 font-medium transition-colors dark:bg-red-600 dark:hover:bg-red-700"
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl flex items-center gap-2 font-medium transition-colors dark:bg-gray-700 dark:hover:bg-gray-800"
                >
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>

            {/* Invoice header: customer / salesman */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Customer
                </label>
                <input
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Salesman
                </label>
                <input
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                  value={salesman}
                  onChange={(e) => setSalesman(e.target.value)}
                  placeholder="Salesman"
                />
              </div>

              <div className="flex items-end justify-end">
                <button
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
                  onClick={addBlankRow}
                >
                  + Blank Row
                </button>
              </div>
            </div>

            {/* 1) Branch stock selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">
                  Branch Stock ({selectedBranch})
                </h3>
                <button
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 font-medium transition-colors"
                  onClick={addSelectedStockToBill}
                >
                  <PlusCircle size={16} /> Add Selected to Bill
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-3 w-8 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800"></th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Label</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Product</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Category</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Weight (g)</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Purity</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Base / Type</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Mode</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLoading && (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-4 text-center text-gray-500"
                        >
                          Loading stock...
                        </td>
                      </tr>
                    )}

                    {!stockLoading &&
                      branchStock.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={!!(item.id && stockSelected[item.id])}
                              onChange={() => toggleStockSelect(item.id!)}
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-800 dark:text-white/90 font-medium">{item.label}</td>
                          <td className="px-3 py-2 text-gray-800 dark:text-white/90">
                            {item.productName || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.category || "-"}</td>
                          <td className="px-3 py-2 text-right text-gray-800 dark:text-white/90">
                            {item.weightG || item.weight || "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800 dark:text-white/90">
                            {item.purity || "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-800 dark:text-white/90">
                            ₹
                            {(
                              item.typeAmount ||
                              item.basePrice ||
                              item.costPrice ||
                              0
                            ).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-left">
                            {item.pricingMode || "type"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.status || "in-branch"}
                          </td>
                        </tr>
                      ))}

                    {!stockLoading && branchStock.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-4 text-center text-gray-500"
                        >
                          No stock available in this branch.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2) Bill table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.03]">
                  <tr>
                    <th className="px-3 py-2 text-left">Sr No</th>
                    <th className="px-3 py-2 text-left">Label</th>
                    <th className="px-3 py-2 text-left">Location</th>
                    <th className="px-3 py-2 text-right">Type / Base (₹)</th>
                    <th className="px-3 py-2 text-right">Mode</th>
                    <th className="px-3 py-2 text-right">Weight (g)</th>
                    <th className="px-3 py-2 text-right">Gold Rate</th>
                    <th className="px-3 py-2 text-right">Making (₹)</th>
                    <th className="px-3 py-2 text-right">Profit %</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price (₹)</th>
                    <th className="px-3 py-2 text-right">Discount (₹)</th>
                    <th className="px-3 py-2 text-right">Taxable (₹)</th>
                    <th className="px-3 py-2 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2">{idx + 1}</td>

                      <td className="px-3 py-2">
                        <input
                          value={r.label}
                          onChange={(e) =>
                            updateRowField(r.id, "label", e.target.value)
                          }
                          className="input-style w-full"
                        />
                      </td>

                      <td className="px-3 py-2">
                        {BRANCH_CODE_MAP[r.branch] || r.branch}
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={r.typeAmount}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "typeAmount",
                              Number(e.target.value) || 0
                            )
                          }
                          className="input-style w-24 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <select
                          value={r.pricingMode}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "pricingMode",
                              e.target.value as "weight" | "type"
                            )
                          }
                          className="input-style w-24 text-right"
                        >
                          <option value="type">Type</option>
                          <option value="weight">Weight</option>
                        </select>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={r.weightG}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "weightG",
                              Number(e.target.value) || 0
                            )
                          }
                          className="input-style w-20 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={r.goldRate}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "goldRate",
                              Number(e.target.value) || 0
                            )
                          }
                          className="input-style w-24 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={r.making}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "making",
                              Number(e.target.value) || 0
                            )
                          }
                          className="input-style w-24 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={r.profitPercent}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "profitPercent",
                              Number(e.target.value) || 0
                            )
                          }
                          className="input-style w-20 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          value={r.qty}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "qty",
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="input-style w-16 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right font-semibold">
                        ₹{r.price.toFixed(2)}
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={r.discount}
                          onChange={(e) =>
                            updateRowField(
                              r.id,
                              "discount",
                              Number(e.target.value) || 0
                            )
                          }
                          className="input-style w-24 text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        ₹{r.taxableAmount.toFixed(2)}
                      </td>

                      <td className="px-3 py-2 text-center">
                        <button
                          className="text-red-500 hover:text-red-600"
                          onClick={() => removeRow(r.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={14}
                        className="py-6 text-center text-gray-500"
                      >
                        No items in bill. Select from branch stock above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals section */}
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">
                  Summary
                </h3>
                <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Subtotal (before discounts)</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Total Discount</span>
                    <span>- ₹{totals.totalDiscount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Taxable Amount</span>
                    <span>₹{totals.taxable.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>CGST ({(GST_RATE / 2).toFixed(2)}%)</span>
                    <span>₹{totals.cgst.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>SGST ({(GST_RATE / 2).toFixed(2)}%)</span>
                    <span>₹{totals.sgst.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between font-bold text-lg mt-2">
                    <span>Grand Total</span>
                    <span className="text-green-600">
                      ₹{totals.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">
                  Actions
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    onClick={handleSaveInvoice}
                  >
                    Save Invoice
                  </button>

                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl"
                    onClick={() => {
                      if (!window.confirm("Reset invoice?")) return;
                      setCustomerName("");
                      setSalesman("");
                      setRows([]);
                    }}
                  >
                    Reset Invoice
                  </button>
                </div>
              </div>
            </div>
          </TASection>
        </div>
      </div>

      {/* Print-only Invoice */}
      {rows.length > 0 && (
        <div className="hidden print:block print-invoice">
          <div className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold">SALES INVOICE</h1>
              <p className="text-sm text-gray-600 mt-2">Branch: {selectedBranch}</p>
              <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
            </div>

            {(customerName || salesman) && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                {customerName && (
                  <div>
                    <p className="text-sm font-semibold">Customer:</p>
                    <p>{customerName}</p>
                  </div>
                )}
                {salesman && (
                  <div>
                    <p className="text-sm font-semibold">Salesman:</p>
                    <p>{salesman}</p>
                  </div>
                )}
              </div>
            )}

            <table className="w-full border-collapse border border-gray-300 mb-6">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">#</th>
                  <th className="border border-gray-300 p-2 text-left">Label</th>
                  <th className="border border-gray-300 p-2 text-left">Product</th>
                  <th className="border border-gray-300 p-2 text-right">Qty</th>
                  <th className="border border-gray-300 p-2 text-right">Price</th>
                  <th className="border border-gray-300 p-2 text-right">Discount</th>
                  <th className="border border-gray-300 p-2 text-right">Taxable</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="border border-gray-300 p-2">{idx + 1}</td>
                    <td className="border border-gray-300 p-2">{row.label}</td>
                    <td className="border border-gray-300 p-2">{row.productName || "-"}</td>
                    <td className="border border-gray-300 p-2 text-right">{row.qty}</td>
                    <td className="border border-gray-300 p-2 text-right">₹{row.price.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-right">₹{row.discount.toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-right">₹{row.taxableAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Discount:</span>
                  <span>₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Taxable:</span>
                  <span>₹{totals.taxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>CGST ({(GST_RATE / 2)}%):</span>
                  <span>₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>SGST ({(GST_RATE / 2)}%):</span>
                  <span>₹{totals.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-2 font-bold text-lg">
                  <span>Grand Total:</span>
                  <span>₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Billing;
