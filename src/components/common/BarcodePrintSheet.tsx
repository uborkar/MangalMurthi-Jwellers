// src/components/common/BarcodePrintSheet.tsx
import BarcodeView from "./BarcodeView";
import "../../styles/print.css";

interface PrintItem {
  barcodeValue: string;
  serial: number;
  category: string;
  design: string;
  location: string;
  type?: string;
  remark?: string;
}

export default function BarcodePrintSheet({ items }: { items: PrintItem[] }) {
  console.log("BarcodePrintSheet - Items received:", items);
  
  if (!items || items.length === 0) {
    return (
      <div className="p-8 bg-white">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold mb-2">No items to print</p>
          <p>Please go back and select items to print.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Header - Only visible when printing */}
      <div className="print-header">
        <h1 className="text-xl font-bold">MangalMurti Jewellers</h1>
        <p className="text-xs text-gray-600">Barcode Labels - {new Date().toLocaleDateString()}</p>
      </div>

      {/* CRITICAL: Wrapper for print isolation */}
      <div id="print-area" className="print-area">
        {/* Tag Grid - Industry standard folded tags */}
        <div className="tags-container">
          {items.map((item, index) => (
            <div 
              key={`${item.barcodeValue}-${index}`}
              className="tag-unfolded"
            >
              {/* LEFT SIDE - Internal Info (Type, Design, Location) */}
              <div className="tag-back">
                <div className="tag-info-line">
                  <span className="tag-label">Type:</span>
                  <span className="tag-value">{item.type || 'N/A'}</span>
                </div>
                <div className="tag-info-line">
                  <span className="tag-label">Design:</span>
                  <span className="tag-value">{item.design || 'N/A'}</span>
                </div>
                <div className="tag-info-line">
                  <span className="tag-label">Loc:</span>
                  <span className="tag-value">{item.location || 'N/A'}</span>
                </div>
              </div>

              {/* MIDDLE - Narrow Tie Gap */}
              <div className="tag-gap"></div>

              {/* RIGHT SIDE - Customer Facing (Item Name + Vertical Barcode) */}
              <div className="tag-front">
                <div className="item-name">{item.remark || item.category}</div>
                <div className="barcode-container">
                  <BarcodeView value={item.barcodeValue} height={16} showValue={false} />
                </div>
                <div className="barcode-text">{item.barcodeValue}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen Preview Info */}
      <div className="screen-only-info">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 mx-4">
          <p className="text-sm text-blue-800">
            <strong>📋 Print Preview:</strong> {items.length} tags ready to print
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Each tag shows: <strong>Left</strong> (Type, Design, Location) • <strong>Middle</strong> (Fold line) • <strong>Right</strong> (Item name + Barcode)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💡 Tip: Click "Print Labels" button above. Tags sized at 1 inch per side (2.08 inches unfolded) - perfect for jewelry items.
          </p>
        </div>
      </div>
    </>
  );
}
