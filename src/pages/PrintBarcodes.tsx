// src/pages/PrintBarcodes.tsx - Premium Printing Interface
import { useEffect, useState } from "react";
import BarcodePrintSheet from "../components/common/BarcodePrintSheet";
import { ArrowLeft, Printer, CheckCircle, Package, Layers } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const handlePrint = () => {
    window.print();
  };

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
        toast.error("No items found in database");
        setIsPrinting(false);
        return;
      }

      await markItemsPrinted(itemIds);
      toast.dismiss(loadingToast);
      toast.success(`Successfully updated ${itemIds.length} items!`);
      setPrintCompleted(true);

      localStorage.removeItem("print_barcodes");
      localStorage.removeItem("print_item_barcodes");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to update items");
    } finally {
      setIsPrinting(false);
    }
  };

  const goBack = () => {
    window.close();
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl">
          <div className="mb-4 flex justify-center">
            <Package size={64} className="text-gray-300 animate-bounce" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-2">Queue is Empty</h2>
          <p className="text-gray-500 mb-8 max-w-sm">No items found in the print queue. Go back to tagging to select items.</p>
          <button
            onClick={goBack}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f0f2f5] transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      {/* 
          PREMIUM CONTROL BAR (Glassmorphism)
      */}
      <div className="no-print fixed top-0 inset-x-0 z-50 p-4 pointer-events-none">
        <div className="max-w-5xl mx-auto pointer-events-auto">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-5 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40">
                <Printer size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-white leading-none">Print Hub</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <Layers size={12} /> {items.length} Labels
                  </span>
                  {printCompleted && (
                    <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full animate-pulse">
                      Status: Synced
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={goBack}
                className="group px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl font-bold transition-all border border-gray-100 flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Close</span>
              </button>

              {!printCompleted && (
                <button
                  onClick={markAsPrinted}
                  disabled={isPrinting}
                  className="px-6 py-3 bg-white text-green-600 border border-green-100 hover:border-green-300 hover:bg-green-50 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle size={20} />
                  <span className="hidden sm:inline">Mark Synced</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="relative overflow-hidden px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/30 active:scale-95 flex items-center gap-2 group"
                disabled={printCompleted}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Printer size={20} />
                <span>Start Printing</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 
          MAIN PREVIEW AREA
      */}
      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10 no-print">
            <h2 className="text-4xl font-black text-gray-800 mb-2">Label Preview Roll</h2>
            <p className="text-gray-500 font-medium">Verify your items before sending to the thermal printer</p>
          </div>

          <div className="shadow-2xl rounded-[40px] overflow-hidden">
            <BarcodePrintSheet items={items} />
          </div>
        </div>
      </main>

      {/* 
          FLOATING TIPS (no-print)
      */}
      <div className="no-print fixed bottom-8 right-8 max-w-xs bg-gray-900 border border-white/10 text-white p-6 rounded-3xl shadow-2xl backdrop-blur-md">
        <h4 className="font-bold mb-3 flex items-center gap-2 text-blue-400">
          🖨️ Printing Pro Tips
        </h4>
        <ul className="text-xs space-y-3 opacity-80 leading-relaxed list-disc ml-4">
          <li>Set Paper Size to <strong>100mm x 15mm</strong></li>
          <li>Set Margins to <strong>None</strong></li>
          <li>Set Scale to <strong>100%</strong></li>
          <li>Turn <strong>OFF</strong> Headers & Footers</li>
        </ul>
      </div>

      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
