// src/components/common/BarcodePrintSheet.tsx - OPTIMIZED JEWELLERY TAG (55mm Printable Area)
import BarcodeView from "./BarcodeView";
import "../../styles/barcode-print.css";

interface PrintItem {
  barcodeValue: string;
  serial: number;
  category: string;
  design: string;
  location: string;
  type?: string;
  remark?: string;
}

interface Props {
  items: PrintItem[];
}

export default function BarcodePrintSheet({ items }: Props) {
  return (
    <>
      {/* 
          REFINED SCREEN PREVIEW - Small Standard Size
      */}
      <div className="barcodes-grid no-print">
        {items.map((item, index) => (
          <div key={index} className="jewellery-tag-preview">
            <div className="preview-body">
              {/* Left Side: Info */}
              <div className="preview-section preview-left">
                <div className="preview-field">T: {item.type || "-"}</div>
                <div className="preview-field">D: {item.design || "-"}</div>
                <div className="preview-field">L: {item.location || "-"}</div>
              </div>

              <div className="preview-fold"></div>

              {/* Right Side: Barcode (Shrinked) */}
              <div className="preview-section preview-right">
                <div className="preview-cat">{item.category}</div>
                <div className="preview-barcode-box">
                  <BarcodeView
                    value={item.barcodeValue}
                    height={20}
                    width={0.8} // Shrinked width
                    displayValue={false}
                  />
                </div>
                <div className="preview-val">{item.barcodeValue}</div>
              </div>
            </div>
            {/* Tail/Bridge */}
            <div className="preview-tail"></div>
          </div>
        ))}
      </div>

      {/* 
          STRICT PRINTING LAYOUT - 100mm total, 55mm body
      */}
      <div className="print-actual-container">
        {items.map((item, index) => (
          <div key={`print-${index}`} className="print-tag-page">
            <div className="print-tag-body">
              {/* LEFT FLAP (Approx 26mm) */}
              <div className="print-section print-left">
                <div className="print-field">T: {item.type || "-"}</div>
                <div className="print-field">D: {item.design || "-"}</div>
                <div className="print-field">L: {item.location || "-"}</div>
              </div>

              {/* CENTER FOLD GAP (Approx 3mm) */}
              <div className="print-fold-gap"></div>

              {/* RIGHT FLAP (Approx 26mm) */}
              <div className="print-section print-right">
                <div className="print-cat">{item.category}</div>
                <div className="print-barcode">
                  <BarcodeView
                    value={item.barcodeValue}
                    height={30}
                    width={0.7}
                    displayValue={false}
                  />
                </div>
                <div className="print-val">{item.barcodeValue}</div>
              </div>
            </div>
            {/* TAIL (45mm) - Usually blank or used for wrapping */}
            <div className="print-tag-tail"></div>
          </div>
        ))}
      </div>


    </>
  );
}
