// src/pages/Warehouse/Tagging.tsx - ERP-CORRECT VERSION
import { useState, useRef, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import CustomDropdown from "../../components/common/CustomDropdown";
import toast from "react-hot-toast";
import { Trash2, Printer, CheckSquare, Square } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { useLocations } from "../../hooks/useLocations";

import { reserveSerials } from "../../firebase/serials";
import BarcodeView from "../../components/common/BarcodeView";
import { makeBarcodeValue, CATEGORY_CODES, LOCATION_CODES } from "../../utils/barcode";

import { batchAddWarehouseItems, markItemsPrinted, getItemByBarcode } from "../../firebase/warehouseItems";

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
  // Print Workflow - Updates DB status to "printed"
  // --------------------------------------------------------------------------------------
  const printSelected = async () => {
    const selectedItems = grid.filter((item) => item.isSelected && !item.isPrinted);
    if (selectedItems.length === 0) {
      return toast.error("Please select items to print");
    }

    // Check if items are saved to database
    const unsavedItems = selectedItems.filter(item => !item.isCommitted);
    if (unsavedItems.length > 0) {
      toast.error(`Please save ${unsavedItems.length} items before printing`, { duration: 4000 });
      return;
    }

    // Generate HTML for printing directly
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error("Please allow pop-ups to print labels");
      return;
    }

    // Generate barcode print layout
    const barcodesHtml = selectedItems.map(item => `
      <div class="barcode-label">
        <div class="barcode-info">
          <div class="info-row">
            <span class="label">Category:</span>
            <span class="value">${category}</span>
          </div>
          <div class="info-row">
            <span class="label">Design:</span>
            <span class="value">${design}</span>
          </div>
          <div class="info-row">
            <span class="label">Location:</span>
            <span class="value">${location}</span>
          </div>
          <div class="info-row">
            <span class="label">Type:</span>
            <span class="value">${type}</span>
          </div>
          <div class="info-row">
            <span class="label">Item:</span>
            <span class="value">${remark}</span>
          </div>
          <div class="info-row">
            <span class="label">Serial:</span>
            <span class="value font-bold">${item.serial}</span>
          </div>
        </div>
        <div class="barcode-container">
          <svg class="barcode" data-value="${item.barcodeValue}"></svg>
          <div class="barcode-text">${item.barcodeValue}</div>
        </div>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Barcode Labels - ${category}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 10mm; 
            background: white;
          }
          .barcode-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10mm;
            margin: 0 auto;
          }
          .barcode-label {
            border: 2px solid #000;
            padding: 8mm;
            background: white;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            gap: 5mm;
          }
          .barcode-info {
            display: flex;
            flex-direction: column;
            gap: 3mm;
          }
          .info-row {
            display: flex;
            gap: 5mm;
            font-size: 11pt;
          }
          .label {
            font-weight: bold;
            min-width: 80px;
          }
          .value {
            flex: 1;
          }
          .font-bold {
            font-weight: bold;
            font-size: 13pt;
          }
          .barcode-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2mm;
            border-top: 1px solid #ccc;
            padding-top: 5mm;
          }
          .barcode {
            max-width: 100%;
            height: auto;
          }
          .barcode-text {
            font-family: monospace;
            font-size: 12pt;
            font-weight: bold;
            letter-spacing: 2px;
          }
          @media print {
            body { padding: 5mm; }
            .no-print { display: none !important; }
            @page {
              size: A4;
              margin: 10mm;
            }
          }
          .print-header {
            text-align: center;
            margin-bottom: 10mm;
            padding: 5mm;
            border-bottom: 2px solid #000;
          }
          .print-header h1 {
            font-size: 20pt;
            margin-bottom: 2mm;
          }
          .print-header .subtitle {
            font-size: 12pt;
            color: #666;
          }
          .no-print {
            text-align: center;
            margin: 20px 0;
          }
          .no-print button {
            padding: 10px 30px;
            font-size: 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          }
          .no-print button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>MangalMurthi Jewellers</h1>
          <div class="subtitle">Barcode Labels - ${category} (${selectedItems.length} items)</div>
        </div>
        
        <div class="no-print">
          <button onclick="window.print()">🖨️ Print Labels</button>
        </div>

        <div class="barcode-grid">
          ${barcodesHtml}
        </div>

        <script>
          // Generate barcodes after page loads
          window.onload = function() {
            const barcodes = document.querySelectorAll('.barcode');
            barcodes.forEach(svg => {
              const value = svg.getAttribute('data-value');
              try {
                JsBarcode(svg, value, {
                  format: 'CODE128',
                  width: 2,
                  height: 60,
                  displayValue: false,
                  margin: 5
                });
              } catch (error) {
                console.error('Error generating barcode:', error);
              }
            });
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Mark items as printed in UI
    setGrid((prev) =>
      prev.map((item) =>
        selectedItems.find((si) => si.id === item.id)
          ? { ...item, isPrinted: true }
          : item
      )
    );

    // Update database status to "printed"
    try {
      // Get item IDs from database by barcode
      const itemIds: string[] = [];
      for (const item of selectedItems) {
        const dbItem = await getItemByBarcode(item.barcodeValue);
        if (dbItem?.id) {
          itemIds.push(dbItem.id);
        }
      }

      if (itemIds.length > 0) {
        await markItemsPrinted(itemIds);
        console.log(`✅ Marked ${itemIds.length} items as printed in database`);
      }
    } catch (error) {
      console.error("Error updating print status:", error);
      // Don't show error to user - print window already opened
    }

    toast.success(`Opening print window for ${selectedItems.length} items`, { duration: 3000 });
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
                  className={`p-4 rounded-xl border ${item.isPrinted
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : item.isCommitted
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : item.isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 bg-white dark:bg-gray-900"
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
                      <div>
                        <h4 className="font-semibold">
                          Item #{idx + 1} — Serial {item.serial}
                        </h4>
                        <div className="flex gap-2 mt-1">
                          {item.isPrinted && (
                            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded font-medium">
                              ✓ Printed
                            </span>
                          )}
                          {item.isCommitted && !item.isPrinted && (
                            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded font-medium">
                              ✓ Saved
                            </span>
                          )}
                          {!item.isCommitted && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded font-medium">
                              ⚠ Not Saved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!item.isCommitted && (
                      <button
                        onClick={() => removeRow(item.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
                className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
