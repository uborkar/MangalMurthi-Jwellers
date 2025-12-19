// src/pages/PrintBarcodes.tsx
import { useEffect, useState } from "react";
import BarcodePrintSheet from "../components/common/BarcodePrintSheet";
import { ArrowLeft, Printer } from "lucide-react";

interface PrintItem {
  barcodeValue: string;
  serial: number;
  category: string;
  design: string;
  location: string;
}

export default function PrintBarcodes() {
  const [items, setItems] = useState<PrintItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("print_barcodes");
    if (stored) {
      setItems(JSON.parse(stored));
    }
  }, []);

  const handlePrint = () => {
    window.print();
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
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Print Barcode Labels</h1>
            <p className="text-sm text-gray-600">{items.length} items ready to print</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold"
            >
              <Printer size={18} />
              Print Labels
            </button>
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
