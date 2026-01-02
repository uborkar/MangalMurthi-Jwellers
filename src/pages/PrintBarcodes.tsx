// src/pages/PrintBarcodes.tsx
import { useEffect, useState } from "react";
import BarcodePrintSheet from "../components/common/BarcodePrintSheet";
import { ArrowLeft, Printer, CheckCircle } from "lucide-react";
import { getItemByBarcode, markItemsPrinted } from "../firebase/warehouseItems";
import toast, { Toaster } from "react-hot-toast";

interface PrintItem {
  barcodeValue: string;
  serial: number;
  category: string;
  design: string;
  location: string;
  type?: string;
  remark?: string;
}

export default function PrintBarcodes() {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printCompleted, setPrintCompleted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("print_barcodes");
    console.log("PrintBarcodes - localStorage data:", stored); // Debug log
    if (stored) {
      const parsedItems = JSON.parse(stored);
      console.log("PrintBarcodes - Parsed items:", parsedItems); // Debug log
      setItems(parsedItems);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const markAsPrinted = async () => {
    const barcodesStr = localStorage.getItem("print_item_barcodes");
    if (!barcodesStr) {
      toast.error("No barcodes found to mark as printed");
      setIsPrinting(false);
      return;
    }

    const barcodes: string[] = JSON.parse(barcodesStr);
    const loadingToast = toast.loading(`Marking ${barcodes.length} items as printed...`);

    try {
      // Find item IDs by barcodes
      const itemIds: string[] = [];
      for (const barcode of barcodes) {
        const item = await getItemByBarcode(barcode);
        if (item && item.id) {
          itemIds.push(item.id);
        }
      }

      if (itemIds.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No items found to mark as printed");
        setIsPrinting(false);
        return;
      }

      // Mark items as printed
      await markItemsPrinted(itemIds);

      toast.dismiss(loadingToast);
      toast.success(`✅ Successfully marked ${itemIds.length} items as printed!`);
      setPrintCompleted(true);

      // Clear localStorage
      localStorage.removeItem("print_barcodes");
      localStorage.removeItem("print_item_barcodes");
    } catch (error) {
      console.error("Error marking items as printed:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to mark items as printed");
    } finally {
      setIsPrinting(false);
    }
  };

  const goBack = () => {
    window.close();
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Items to Print</h2>
          <p className="text-gray-600 mb-4">Please select items from the tagging page first.</p>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Print Barcode Labels</h1>
            <p className="text-sm text-gray-600">{items.length} items ready to print</p>
            {printCompleted && (
              <p className="text-sm text-green-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle size={16} />
                Items marked as printed in database
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              disabled={isPrinting}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={printCompleted}
            >
              <Printer size={18} />
              {printCompleted ? "Print Completed" : "Print Labels"}
            </button>
            {!printCompleted && (
              <button
                onClick={markAsPrinted}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPrinting}
              >
                <CheckCircle size={18} />
                Mark as Printed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Print Preview */}
      <div className="max-w-7xl mx-auto py-6">
        <BarcodePrintSheet items={items} />
      </div>
    </div>
  );
}
