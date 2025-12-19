// src/components/common/BarcodePrintSheet.tsx
import BarcodeView from "./BarcodeView";

interface PrintItem {
  barcodeValue: string;
  serial: number;
  category: string;
  design: string;
  location: string;
}

export default function BarcodePrintSheet({ items }: { items: PrintItem[] }) {
  return (
    <div className="p-8 bg-white">
      {/* Print Header */}
      <div className="text-center mb-6 print:block hidden">
        <h1 className="text-2xl font-bold">MangalMurti Jewellers</h1>
        <p className="text-sm text-gray-600">Barcode Labels - {new Date().toLocaleDateString()}</p>
      </div>

      {/* Label Grid - 3 columns for A4 sticker sheets */}
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <div 
            key={item.barcodeValue} 
            className="border-2 border-dashed border-gray-300 p-3 text-center break-inside-avoid"
            style={{ pageBreakInside: 'avoid' }}
          >
            {/* Barcode */}
            <div className="mb-2">
              <BarcodeView value={item.barcodeValue} height={35} />
            </div>
            
            {/* Barcode Value */}
            <div className="font-mono text-[9px] font-bold">
              {/* {item.barcodeValue} */}

            </div>
          </div>
        ))}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
