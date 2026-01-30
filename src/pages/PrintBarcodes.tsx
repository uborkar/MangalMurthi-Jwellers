// src/pages/PrintBarcodes.tsx - AUTO PRINT ON LOAD
import { useEffect, useState } from "react";
import BarcodePrintSheet from "../components/common/BarcodePrintSheet";
import { ArrowLeft, CheckCircle, Printer } from "lucide-react";
import { getItemByBarcode, markItemsPrinted } from "../firebase/warehouseItems";
import toast from "react-hot-toast";

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
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  // Load items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("print_barcodes");
    if (stored) {
      try {
        const parsedItems = JSON.parse(stored);
        setItems(parsedItems);
      } catch (e) {
        console.error("Failed to parse stored barcodes");
      }
    }
  }, []);

  // Auto-trigger print dialog when items are loaded
  useEffect(() => {
    if (items.length > 0 && !autoPrintTriggered) {
      const timer = setTimeout(() => {
        setAutoPrintTriggered(true);
        window.print();
      }, 1000); // Slightly longer delay for professional "Loading" feel
      return () => clearTimeout(timer);
    }
  }, [items, autoPrintTriggered]);

  const markAsPrinted = async () => {
    const barcodesStr = localStorage.getItem("print_item_barcodes");
    if (!barcodesStr) {
      toast.error("No barcodes found to mark as printed");
      return;
    }

    setIsPrinting(true);
    const barcodes: string[] = JSON.parse(barcodesStr);
    const loadingToast = toast.loading(`Marking ${barcodes.length} items as printed...`);

    try {
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

      await markItemsPrinted(itemIds);
      toast.dismiss(loadingToast);
      toast.success(`Successfully marked ${itemIds.length} items as printed!`);
      setPrintCompleted(true);

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

  const triggerManualPrint = () => {
    window.print();
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Printer size={32} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Items in Queue</h2>
          <p className="text-gray-600 mb-6">Please select items from the tagging page first.</p>
          <button
            onClick={goBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Printer size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-800 uppercase tracking-tight">Print Queue</h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">
                  {items.length} TAGS READY
                </span>
                {!autoPrintTriggered && (
                  <span className="text-[10px] text-gray-400 animate-pulse flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                    Preparing print dialog...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={triggerManualPrint}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold text-sm shadow-sm transition-all"
            >
              <Printer size={16} />
              Re-Print
            </button>
            <button
              onClick={goBack}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold text-sm shadow-sm transition-all"
            >
              <ArrowLeft size={16} />
              Close
            </button>
            {!printCompleted && (
              <button
                onClick={markAsPrinted}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-black text-sm shadow-lg shadow-green-200 disabled:opacity-50 transition-all"
                disabled={isPrinting}
              >
                <CheckCircle size={16} />
                Mark as Printed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Print Preview Area */}
      <div className="max-w-5xl mx-auto py-12 px-6">
        {!autoPrintTriggered && (
          <div className="no-print mb-8 p-10 bg-white border border-blue-100 rounded-3xl shadow-xl shadow-blue-50/50 text-center">
            <div className="inline-block p-4 bg-blue-50 rounded-2xl mb-4 animate-bounce">
              <Printer size={40} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2">Initializing Barcode Printer</h2>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">
              The browser print dialog will open automatically in a second.
              Please ensure your thermal printer is selected.
            </p>
          </div>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-inner border border-gray-100 min-h-[400px]">
          <BarcodePrintSheet items={items} />
        </div>
      </div>
    </div>
  );
}
