// src/pages/Warehouse/Tagging.tsx
import { useState, useRef, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Trash2, Printer, CheckSquare, Square } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";

import { reserveSerials } from "../../firebase/serials";
import BarcodeView from "../../components/common/BarcodeView";
import { makeBarcodeValue, CATEGORY_CODES, LOCATION_CODES } from "../../utils/barcode";

import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

const firestore = db;

// --------------------------------------------------------------------------------------
// Interfaces
// --------------------------------------------------------------------------------------
interface GridItem {
  id: string;
  serial: number;
  barcodeValue: string;
  isCommitted?: boolean;
  isSelected?: boolean;
}

const locations = ["Mumbai Malad", "Pune", "Sangli"];

// --------------------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------------------
export default function Tagging() {
  // Dynamic Categories
  const { categories, loading: categoriesLoading } = useCategories();

  // Batch Inputs
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState<number>(10);
  const [type, setType] = useState(""); // Cost Price Type
  const [design, setDesign] = useState("");
  const [remark, setRemark] = useState("");
  const [location, setLocation] = useState(locations[0]);

  // Generated Items
  const [grid, setGrid] = useState<GridItem[]>([]);
  const gridRef = useRef<GridItem[]>([]);
  gridRef.current = grid;

  // UI state
  const [reserving, setReserving] = useState(false);
  const [saving, setSaving] = useState(false);

  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  // --------------------------------------------------------------------------------------
  // Reserve Serials + Generate Batch
  // --------------------------------------------------------------------------------------
  const handleGenerateBatch = async () => {
    if (!quantity || quantity <= 0) return toast.error("Enter valid quantity");
    if (!type) return toast.error("Enter Cost Price Type");
    if (!design) return toast.error("Enter Design");
    if (!remark) return toast.error("Enter Remark/Item Name");

    setReserving(true);

    try {
      const catCode = CATEGORY_CODES[category] ?? "UNK";
      const locCode = LOCATION_CODES[location] ?? "LOC";
      const yy = new Date().getFullYear();
      const counterKey = `MG-${catCode}-${String(yy).slice(-2)}`;

      // Reserve serials from category-specific counter
      const { start, end } = await reserveSerials(counterKey, quantity);

      const rows: GridItem[] = [];
      for (let s = start; s <= end; s++) {
        const barcodeValue = makeBarcodeValue("MG", catCode, locCode, yy, s);
        rows.push({
          id: crypto.randomUUID(),
          serial: s,
          barcodeValue,
          isSelected: false,
        });
      }

      setGrid(rows);
      toast.success(
        `✅ Generated ${quantity} ${category} tags (Serial: ${start}-${end})\n` +
        `Counter: ${counterKey}`,
        { duration: 4000 }
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate tags");
    }

    setReserving(false);
  };

  // --------------------------------------------------------------------------------------
  // Remove a generated row
  // --------------------------------------------------------------------------------------
  const removeRow = (id: string) => {
    setGrid((prev) => prev.filter((r) => r.id !== id));
  };

  // --------------------------------------------------------------------------------------
  // Selection Handlers
  // --------------------------------------------------------------------------------------
  const toggleSelection = (id: string) => {
    setGrid((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const selectAll = () => {
    setGrid((prev) => prev.map((item) => ({ ...item, isSelected: true })));
  };

  const deselectAll = () => {
    setGrid((prev) => prev.map((item) => ({ ...item, isSelected: false })));
  };

  // --------------------------------------------------------------------------------------
  // Print Workflow
  // --------------------------------------------------------------------------------------
  const printSelected = () => {
    const selectedItems = grid.filter((item) => item.isSelected);
    if (selectedItems.length === 0) {
      return toast.error("Please select items to print");
    }

    const printData = selectedItems.map((item) => ({
      barcodeValue: item.barcodeValue,
      serial: item.serial,
      category: category,
      design: design,
      location: location,
      type: type,
      remark: remark,
    }));

    localStorage.setItem("print_barcodes", JSON.stringify(printData));
    window.open("/print-barcodes", "_blank");
  };

  // --------------------------------------------------------------------------------------
  // Save Batch to Firestore (warehouse/tagged_items/items)
  // --------------------------------------------------------------------------------------
  const saveBatch = async () => {
    const toSave = gridRef.current.filter((i) => !i.isCommitted);
    if (toSave.length === 0) return toast.error("Nothing to save");

    setSaving(true);
    const batch = writeBatch(firestore);

    try {
      // Correct path: warehouse/tagged_items/items
      const colRef = collection(firestore, "warehouse", "tagged_items", "items");

      toSave.forEach((item) => {
        const newDoc = doc(colRef);

        batch.set(newDoc, {
          // Barcode as label (primary identifier)
          label: item.barcodeValue,
          
          // Category information (PRIMARY: itemType becomes category)
          category: category, // Ring, Necklace, Bracelet, etc. - PRIMARY CATEGORY
          subcategory: design, // Design/Pattern (e.g., FLORAL)
          
          // Location
          location,
          
          // Additional fields
          weight: "", // Empty for now, can be filled later
          purity: "Gold Forming", // Default purity
          price: 0, // Price to be added later
          
          // Serial and metadata
          serial: item.serial,
          stockRefId: null,
          status: "pending",
          
          // Audit fields
          createdAt: new Date().toISOString(),
          
          // Extra metadata for tracking
          barcodeValue: item.barcodeValue,
          categoryCode: CATEGORY_CODES[category] ?? "UNK",
          locationCode: LOCATION_CODES[location] ?? "LOC",
          costPriceType: type, // CP-A, CP-B, etc.
          remark, // Item name/description
          year: new Date().getFullYear(),
          
          // Print tracking
          printed: false,
          printedAt: null,
        });
      });

      await batch.commit();

      setGrid((prev) =>
        prev.map((r) => ({
          ...r,
          isCommitted: true,
        }))
      );

      toast.success(`🎉 Successfully saved ${toSave.length} items to warehouse!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save batch");
    }

    setSaving(false);
  };

  // --------------------------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------------------------
  return (
    <>
      <PageMeta title="Batch Tagging" description="Generate and save tagging batches" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🏷️ Batch Tagging & Barcode Generation"
            subtitle="Industry-standard barcode tagging for jewellery items"
          >
            {/* Info Banner - Category-wise Serial Tracking */}
            {/* <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">📊 Category-Wise Serial Tracking</h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Each category (Ring, Necklace, Bracelet, etc.) maintains its own independent serial counter. 
                Example: If Ring ends at serial 20, the next Ring batch will start at 21, but Necklace will start from 1 (or continue from its last count).
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                💡 Counter Pattern: <code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">MG-{"{CATEGORY_CODE}"}-{"{YEAR}"}</code> 
                (e.g., MG-RNG-25 for Rings in 2025)
              </p>
            </div> */}

            {/* Batch Input Form */}
            <div className="p-5 rounded-xl border border-gray-300 bg-white dark:bg-gray-900 mb-5">
              <h3 className="font-bold mb-3">Batch Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm block mb-1 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    disabled={categoriesLoading}
                  >
                    {categoriesLoading ? (
                      <option>Loading...</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sm block mb-1 font-medium">Quantity</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-sm block mb-1 font-medium">Type</label>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    placeholder="e.g. CP-A"
                  />
                </div>

                <div>
                  <label className="text-sm block mb-1 font-medium">Design</label>
                  <input
                    type="text"
                    value={design}
                    onChange={(e) => setDesign(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    placeholder="e.g. FLORAL"
                  />
                </div>

                <div>
                  <label className="text-sm block mb-1 font-medium">Remark / Item Name</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    placeholder="e.g. Daily Wear Necklace"
                  />
                </div>

                <div>
                  <label className="text-sm block mb-1 font-medium">Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                  >
                    {locations.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg"
                onClick={handleGenerateBatch}
                disabled={reserving}
              >
                {reserving ? "Generating..." : "Generate Batch"}
              </button>
            </div>

            {/* Selection Controls */}
            {grid.length > 0 && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 mb-5 flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <CheckSquare size={16} />
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <Square size={16} />
                    Deselect All
                  </button>
                </div>
                <div className="flex-1" />
                <button
                  onClick={printSelected}
                  className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                >
                  <Printer size={16} />
                  Print Selected ({grid.filter((i) => i.isSelected).length})
                </button>
              </div>
            )}

            {/* Grid Output */}
            <div className="space-y-4">
              {grid.length === 0 && (
                <div className="text-sm text-gray-500">No items generated yet.</div>
              )}

              {grid.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border ${
                    item.isCommitted
                      ? "border-green-500 bg-green-50"
                      : item.isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      {!item.isCommitted && (
                        <input
                          type="checkbox"
                          checked={item.isSelected || false}
                          onChange={() => toggleSelection(item.id)}
                          className="w-5 h-5 cursor-pointer"
                        />
                      )}
                      <h4 className="font-semibold">
                        Item #{idx + 1} — Serial {item.serial}
                      </h4>
                    </div>

                    {!item.isCommitted && (
                      <button
                        onClick={() => removeRow(item.id)}
                        className="p-2 bg-red-500 text-white rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Barcode Value</label>
                      <div className="font-mono text-sm">{item.barcodeValue}</div>
                    </div>

                    <div className="md:col-span-2 flex items-center justify-center border p-3 rounded-lg">
                      <BarcodeView value={item.barcodeValue} height={50} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            {grid.length > 0 && (
              <button
                className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg"
                onClick={saveBatch}
                disabled={saving}
              >
                {saving ? "Saving..." : `Save All (${grid.filter((i) => !i.isCommitted).length})`}
              </button>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
