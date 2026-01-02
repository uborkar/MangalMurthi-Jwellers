import React, { useEffect, useMemo, useState } from "react";
import { Download, Printer, Plus, Trash2 } from "lucide-react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import {
  performShopTransfer,
  ShopTransferPayload,
  ShopTransferRow,
  ShopTransferLog,
} from "../../firebase/transfers";

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */

type ShopName = "Sangli" | "Miraj" | "Kolhapur" | string;

interface TransferRow {
  label: string;
  category?: string;
  weight?: string;
  purity?: string;
  price?: number;
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

    const row: TransferRow = {
      label: selectedFoundItem.label,
      category: selectedFoundItem.category,
      weight: String(selectedFoundItem.weight || ""),
      purity: selectedFoundItem.purity,
      price: selectedFoundItem.price,
      quantity: 1,
    };

    setTransferRows((prev) => [...prev, row]);
    setSelectedFoundItem(null);
    setLabelSearch("");
  };

  const addManualRow = () => {
    setTransferRows((prev) => [
      ...prev,
      { label: "", category: "", weight: "", purity: "", price: 0, quantity: 1 },
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
    let totalQty = 0;
    let totalWeight = 0;

    transferRows.forEach((r) => {
      totalQty += Number(r.quantity);
      totalWeight += parseFloat(r.weight || "0") * (r.quantity || 1);
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
          category: r.category,
          weight: r.weight,
          purity: r.purity,
          price: r.price,
          quantity: r.quantity,
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
     Generate Challan Window
  ---------------------------------------------------- */
  const openChallanWindow = (log: ShopTransferLog) => {
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      toast.error("Please allow popups!");
      return;
    }

    const d = new Date(log.date);

    const html = `
      <html><head>
      <title>${log.transferNo}</title>
      <style>
        body { font-family: Arial; padding:20px; }
        table { width:100%; border-collapse:collapse; margin-top:10px; }
        th,td { border:1px solid #555; padding:6px; font-size:14px; }
        .sign { height:60px; border-bottom:1px solid #000; width:200px; }
      </style>
      </head>
      <body>
      <h2>Transfer Challan</h2>
      <div><b>Transfer No:</b> ${log.transferNo}</div>
      <div><b>Date:</b> ${d.toLocaleString()}</div>
      <div><b>From:</b> ${log.fromShop}</div>
      <div><b>To:</b> ${log.toShop}</div>
      <br>

      <table>
        <thead>
          <tr>
            <th>Sr</th>
            <th>Label</th>
            <th>Category</th>
            <th>Weight</th>
            <th>Purity</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          ${log.rows
            .map(
              (r: ShopTransferRow, i: number) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.label}</td>
              <td>${r.category || "-"}</td>
              <td>${r.weight || "-"}</td>
              <td>${r.purity || "-"}</td>
              <td>${r.quantity}</td>
            </tr>`
            )
            .join("")}
          <tr>
            <td colspan="5" style="text-align:right"><b>Total Qty</b></td>
            <td>${log.totals.totalQty}</td>
          </tr>
          <tr>
            <td colspan="5" style="text-align:right"><b>Total Weight</b></td>
            <td>${log.totals.totalWeight} gms</td>
          </tr>
        </tbody>
      </table>

      <br>
      <div><b>Remarks:</b> ${log.remarks || "-"}</div>
      ${
        log.missingLabels && log.missingLabels.length > 0
          ? `<br><div style="color:red"><b>⚠️ Missing Items:</b> ${log.missingLabels.join(", ")}</div>`
          : ""
      }

      <br><br>
      <table width="100%">
        <tr>
          <td><div class="sign"></div>Sender Signature</td>
          <td><div class="sign"></div>Receiver Signature</td>
        </tr>
      </table>

      <script>window.print();</script>
      </body></html>
    `;

    win.document.write(html);
    win.document.close();
  };

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */

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
            {/* Basic Inputs */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium">From Shop</label>
                <select
                  className={inputStyle}
                  value={fromShop}
                  onChange={(e) => setFromShop(e.target.value)}
                >
                  <option value="">Select</option>
                  {DEFAULT_SHOPS.map((s) => (
                    <option key={s} value={s}>
                      {s} ({branchStock[s]?.length || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">To Shop</label>
                <select
                  className={inputStyle}
                  value={toShop}
                  onChange={(e) => setToShop(e.target.value)}
                >
                  <option value="">Select</option>
                  {DEFAULT_SHOPS.map((s) => (
                    <option key={s} value={s}>
                      {s} ({branchStock[s]?.length || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Transport / Vehicle</label>
                <input
                  className={inputStyle}
                  value={transportBy}
                  onChange={(e) => setTransportBy(e.target.value)}
                />
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <label className="text-sm font-medium">Search Item (Label)</label>
              <div className="flex gap-2 mt-2">
                <input
                  className={`${inputStyle} flex-1`}
                  value={labelSearch}
                  placeholder="Type part of label..."
                  onChange={(e) => setLabelSearch(e.target.value)}
                />
                <button
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 font-medium transition-colors"
                  onClick={() =>
                    selectedFoundItem ? addSelectedItem() : addManualRow()
                  }
                >
                  <Plus size={16} /> Add
                </button>
              </div>

              {fromShop && foundItems.length > 0 && (
                <div className="mt-3 max-h-44 overflow-auto border rounded-lg bg-white dark:bg-white/10 p-2">
                  {foundItems.map((item, i) => (
                    <div
                      key={i}
                      className={`p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-white/10 ${
                        selectedFoundItem?.label === item.label
                          ? "ring-2 ring-blue-400"
                          : ""
                      }`}
                      onClick={() => setSelectedFoundItem(item)}
                    >
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500">
                        {item.category} • {item.weight}g • {item.purity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer Rows */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Transfer Items</h3>
              {transferRows.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-3 p-3 border rounded-xl bg-white dark:bg-white/10 mb-3"
                >
                  <div className="col-span-5">
                    <input
                      className={inputStyle}
                      value={r.label}
                      placeholder="Label"
                      onChange={(e) => updateRow(i, "label", e.target.value)}
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      className={inputStyle}
                      placeholder="Weight"
                      value={r.weight || ""}
                      onChange={(e) => updateRow(i, "weight", e.target.value)}
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      className={inputStyle}
                      placeholder="Purity"
                      value={r.purity || ""}
                      onChange={(e) => updateRow(i, "purity", e.target.value)}
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      className={inputStyle}
                      value={r.quantity}
                      min={1}
                      onChange={(e) =>
                        updateRow(i, "quantity", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="col-span-1 flex items-center">
                    <button
                      className="p-2 bg-red-600 text-white rounded"
                      onClick={() => removeRow(i)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-9">
                <label className="text-sm font-medium">Remarks</label>
                <input
                  className={inputStyle}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="col-span-3">
                <div className="mb-2 text-sm text-gray-600">
                  Qty: {computeTotals().totalQty} • Weight:{" "}
                  {computeTotals().totalWeight} gms
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                    onClick={performTransfer}
                    disabled={loading}
                  >
                    {loading ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <Download size={16} /> Save & Challan
                      </>
                    )}
                  </button>

                  <button
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl disabled:opacity-50 font-medium transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
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
                    disabled={loading}
                  >
                    <Printer size={14} />
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
