// src/pages/Warehouse/Tagging.tsx - ERP-CORRECT VERSION
import { useState, useRef, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import toast from "react-hot-toast";
import { Trash2, Printer, CheckSquare, Square, Save } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { useLocations } from "../../hooks/useLocations";

import { reserveSerials } from "../../firebase/serials";
import BarcodeView from "../../components/common/BarcodeView";
import { makeBarcodeValue, CATEGORY_CODES, LOCATION_CODES } from "../../utils/barcode";

import { batchAddWarehouseItems, markItemsPrinted, getItemByBarcode } from "../../firebase/warehouseItems";
import BarcodePrintSheet from "../../components/common/BarcodePrintSheet";

// --------------------------------------------------------------------------------------
// Interfaces
// --------------------------------------------------------------------------------------
interface GridItem {
  id: string;
  serial: number;
  barcodeValue: string;
  isCommitted?: boolean;
  isSelected?: boolean;
  isPrinted?: boolean; // UI-only flag, NOT a business status
}

// --------------------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------------------
export default function Tagging() {
  // Dynamic Categories and Locations from Firebase
  const { categories: loadedCategories, loading: categoriesLoading } = useCategories();
  const { locations: loadedLocations, loading: locationsLoading } = useLocations();

  // Local state for dynamically managed categories and locations
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  // Batch Inputs
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState<number>(10);
  const [type, setType] = useState(""); // Cost Price Type
  const [design, setDesign] = useState("");
  const [remark, setRemark] = useState("");
  const [location, setLocation] = useState("");

  // Form lock state (after batch generation)
  const [formLocked, setFormLocked] = useState(false);

  // Generated Items
  const [grid, setGrid] = useState<GridItem[]>([]);
  const gridRef = useRef<GridItem[]>([]);
  gridRef.current = grid;

  // UI state
  const [reserving, setReserving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemsToPrint, setItemsToPrint] = useState<any[]>([]);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  // Trigger print when itemsToPrint is updated
  useEffect(() => {
    if (itemsToPrint.length > 0 && isPreparingPrint) {
      // Use a very small delay just to let the DOM update
      const timer = setTimeout(() => {
        window.print();
        setIsPreparingPrint(false);
        setItemsToPrint([]);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [itemsToPrint, isPreparingPrint]);

  // Set default category and location when they load
  useEffect(() => {
    if (loadedCategories.length > 0 && categoryOptions.length === 0) {
      const catNames = loadedCategories.map(c => c.name);
      setCategoryOptions(catNames);
      if (!category && catNames.length > 0) {
        setCategory(catNames[0]);
      }
    }
  }, [loadedCategories, categoryOptions, category]);

  useEffect(() => {
    if (loadedLocations.length > 0 && locationOptions.length === 0) {
      const locNames = loadedLocations.map(l => l.name);
      setLocationOptions(locNames);
      if (!location && locNames.length > 0) {
        setLocation(locNames[0]);
      }
    }
  }, [loadedLocations, locationOptions, location]);

  // Handlers for adding new categories/locations
  const handleAddCategory = (newCategory: string) => {
    if (newCategory && !categoryOptions.includes(newCategory)) {
      setCategoryOptions(prev => [...prev, newCategory]);
      setCategory(newCategory);
      toast.success(`Added new category: ${newCategory}`);
    }
  };

  const handleAddLocation = (newLocation: string) => {
    if (newLocation && !locationOptions.includes(newLocation)) {
      setLocationOptions(prev => [...prev, newLocation]);
      setLocation(newLocation);
      toast.success(`Added new location: ${newLocation}`);
    }
  };

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

      // Reserve serials from category-specific counter (with gap filling)
      const { start, end, serials } = await reserveSerials(counterKey, quantity);

      const rows: GridItem[] = [];
      // Use the actual serials array (which may include gaps)
      for (const s of serials) {
        const barcodeValue = makeBarcodeValue("MG", catCode, locCode, yy, s);
        rows.push({
          id: crypto.randomUUID(),
          serial: s,
          barcodeValue,
          isSelected: false,
        });
      }

      setGrid(rows);

      // LOCK FORM after successful generation
      setFormLocked(true);

      // Show message about gap filling if applicable
      const hasGaps = serials.length > 0 && (serials[serials.length - 1] - serials[0] + 1) > serials.length;
      const message = hasGaps
        ? `✅ Generated ${quantity} ${category} tags (Serials: ${serials.join(', ')})\n` +
        `♻️ Reused deleted serial numbers\n` +
        `Counter: ${counterKey}`
        : `✅ Generated ${quantity} ${category} tags (Serial: ${start}-${end})\n` +
        `Counter: ${counterKey}`;

      toast.success(message, { duration: 4000 });
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
  // Print Workflow - Navigate to clean preview page
  // --------------------------------------------------------------------------------------
  const printSelected = async () => {
    const selectedItems = grid.filter((item) => item.isSelected);
    if (selectedItems.length === 0) {
      return toast.error("Please select items to print");
    }

    // Check if items are saved to database
    const unsavedItems = selectedItems.filter(item => !item.isCommitted);
    if (unsavedItems.length > 0) {
      toast.error(`Please save ${unsavedItems.length} items before printing`, { duration: 4000 });
      return;
    }

    setIsPreparingPrint(true);

    // Prepare print data
    const printItems = selectedItems.map(item => ({
      barcodeValue: item.barcodeValue,
      serial: item.serial,
      category: category,
      design: design,
      location: location,
      type: type,
      remark: remark,
    }));

    setItemsToPrint(printItems);

    // Mark items as printed in UI
    setGrid((prev) =>
      prev.map((item) =>
        selectedItems.find((si) => si.id === item.id)
          ? { ...item, isPrinted: true }
          : item
      )
    );

    toast.success(`Preparing labels for ${selectedItems.length} items...`);
  };

  // --------------------------------------------------------------------------------------
  // Save Batch to Firestore - ALWAYS status = "tagged"
  // --------------------------------------------------------------------------------------
  const saveBatch = async () => {
    const toSave = gridRef.current.filter((i) => !i.isCommitted);
    if (toSave.length === 0) return toast.error("Nothing to save");

    setSaving(true);

    try {
      const catCode = CATEGORY_CODES[category] ?? "UNK";
      const locCode = LOCATION_CODES[location] ?? "LOC";
      const year = new Date().getFullYear();

      // Prepare items for batch save - SIMPLE FLAT STRUCTURE
      const itemsToSave = toSave.map((item) => ({
        barcode: item.barcodeValue,
        serial: item.serial,
        category: category,
        subcategory: design,
        categoryCode: catCode,
        location: location,
        locationCode: locCode,
        weight: "",
        costPrice: 0,
        costPriceType: type,
        remark: remark,
        year: year,
        taggedAt: new Date().toISOString(),
        status: "tagged" as const,
      }));

      // Batch save to FLAT collection: warehouseItems
      const savedCount = await batchAddWarehouseItems(itemsToSave);

      setGrid((prev) =>
        prev.map((r) => ({
          ...r,
          isCommitted: true,
        }))
      );

      toast.success(`🎉 Successfully saved ${savedCount} items to warehouse!`);
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to save batch: ${error.message || 'Unknown error'}`);
    }

    setSaving(false);
  };

  // --------------------------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------------------------
  return (
    <>
      <div className="no-print">
        <PageMeta title="Batch Tagging" description="Generate and save tagging batches" />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <TASection
              title="🏷️ Batch Tagging & Barcode Generation"
              subtitle="Industry-standard barcode tagging for jewellery items"
            >
              {/* Batch Input Form */}
              <div className="p-5 rounded-xl border border-gray-300 bg-white dark:bg-gray-900 mb-5">
                <h3 className="font-bold mb-3">Batch Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm block mb-1 font-medium">Category</label>
                    {categoriesLoading ? (
                      <div className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 animate-pulse">
                        Loading categories...
                      </div>
                    ) : (
                      <CustomDropdown
                        options={categoryOptions}
                        value={category}
                        onChange={(val) => setCategory(val)}
                        onAddNew={handleAddCategory}
                        placeholder="Select Category"
                        addNewPlaceholder="Add new category..."
                        disabled={formLocked}
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium">Location</label>
                    {locationsLoading ? (
                      <div className="w-full p-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 animate-pulse">
                        Loading locations...
                      </div>
                    ) : (
                      <CustomDropdown
                        options={locationOptions}
                        value={location}
                        onChange={(val) => setLocation(val)}
                        onAddNew={handleAddLocation}
                        placeholder="Select Location"
                        addNewPlaceholder="Add new location..."
                        disabled={formLocked}
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium">Quantity</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      disabled={formLocked}
                    />
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium">Design</label>
                    <input
                      type="text"
                      value={design}
                      onChange={(e) => setDesign(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g. FLORAL"
                      disabled={formLocked}
                    />
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium">Type</label>
                    <input
                      type="text"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g. CP-A"
                      disabled={formLocked}
                    />
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium">Remark / Item Name</label>
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g. Daily Wear Necklace"
                      disabled={formLocked}
                    />
                  </div>

                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleGenerateBatch}
                    disabled={reserving || formLocked}
                  >
                    {reserving ? "Generating..." : "Generate Batch"}
                  </button>

                  {formLocked && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                      🔒 Form locked - Serials reserved
                    </div>
                  )}
                </div>
              </div>

              {/* Selection & Action Bar - STICKY */}
              {grid.length > 0 && (
                <div className="sticky top-[72px] z-20 p-4 rounded-xl border border-blue-200 bg-white/80 backdrop-blur-md shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={selectAll}
                        className="px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md text-sm font-medium transition-all flex items-center gap-2 text-gray-700"
                      >
                        <CheckSquare size={16} />
                        Select All
                      </button>
                      <button
                        onClick={deselectAll}
                        className="px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-md text-sm font-medium transition-all flex items-center gap-2 text-gray-700"
                      >
                        <Square size={16} />
                        None
                      </button>
                    </div>
                    <div className="h-6 w-[1px] bg-gray-300 mx-1" />
                    <span className="text-sm font-bold text-blue-700">
                      {grid.filter(i => i.isSelected).length} Selected
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveBatch}
                      disabled={saving || grid.filter(i => !i.isCommitted).length === 0}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <Save size={18} />
                      {saving ? "Saving..." : `Save All (${grid.filter(i => !i.isCommitted).length})`}
                    </button>

                    <button
                      onClick={printSelected}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"
                    >
                      <Printer size={18} />
                      Print Selected
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Grid Output */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {grid.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400">No items generated yet. Use the form above to start.</p>
                  </div>
                )}

                {grid.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden p-4 rounded-xl border-2 transition-all group ${item.isPrinted
                      ? "border-purple-200 bg-purple-50/30"
                      : item.isCommitted
                        ? "border-green-200 bg-green-50/30"
                        : item.isSelected
                          ? "border-blue-400 bg-blue-50/50 shadow-md ring-2 ring-blue-100"
                          : "border-gray-100 bg-white hover:border-gray-300"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {!item.isCommitted ? (
                          <input
                            type="checkbox"
                            checked={item.isSelected || false}
                            onChange={() => toggleSelection(item.id)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        ) : (
                          <div className="w-5 h-5 flex items-center justify-center text-green-600">
                            <CheckSquare size={18} />
                          </div>
                        )}
                        <span className="text-xs font-black text-gray-400">#{idx + 1}</span>
                      </div>

                      {!item.isCommitted && (
                        <button
                          onClick={() => removeRow(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-800">Serial: {item.serial}</span>
                        <div className="flex gap-1">
                          {item.isPrinted && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">Printed</span>
                          )}
                          {item.isCommitted ? (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Saved</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase">Unsaved</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-gray-100 flex flex-col items-center">
                        <BarcodeView value={item.barcodeValue} height={35} width={1.2} />
                        <span className="mt-1 font-mono text-[10px] font-bold tracking-wider text-gray-500">
                          {item.barcodeValue}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TASection>
          </div>
        </div>
      </div>

      {/* Hidden Print Container */}
      <div className="print-only-container">
        {itemsToPrint.length > 0 && <BarcodePrintSheet items={itemsToPrint} />}
      </div>
    </>
  );
}



