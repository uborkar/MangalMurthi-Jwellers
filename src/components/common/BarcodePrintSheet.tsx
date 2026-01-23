// src/components/common/BarcodePrintSheet.tsx - OPTIMIZED JEWELLERY TAG (55mm Printable Area)
import BarcodeView from "./BarcodeView";

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
                    height={28}
                    width={0.8} // Shrinked width for printing too
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

      <style jsx>{`
        /* ================================================
           SCREEN PREVIEW STYLES (SMALL STANDARD)
           ================================================ */
        .barcodes-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          justify-content: center;
        }

        .jewellery-tag-preview {
          width: 380px; /* Small standard preview width */
          height: 80px;
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          padding: 5px;
        }

        .preview-body {
          width: 55%; /* Representing the 55mm printable area */
          height: 100%;
          display: flex;
          border: 1px dashed #cbd5e1;
          border-radius: 2px;
        }

        .preview-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 5px;
          overflow: hidden;
        }

        .preview-left {
          font-size: 10px;
          font-weight: 600;
          color: #334155;
          line-height: 1.2;
        }

        .preview-fold {
          width: 2px;
          border-left: 1px dotted #cbd5e1;
          height: 100%;
        }

        .preview-right {
          text-align: center;
        }

        .preview-cat {
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .preview-barcode-box {
          display: flex;
          justify-content: center;
        }

        .preview-val {
          font-family: monospace;
          font-size: 8px;
          font-weight: 700;
          margin-top: 2px;
        }

        .preview-tail {
          width: 45%; /* Representing the 45mm tail */
          height: 4px;
          background: #f1f5f9;
          border-radius: 0 2px 2px 0;
        }

        /* ================================================
           ACTUAL PRINT STYLES (100mm x 15mm)
           ================================================ */
        .print-actual-container {
          display: none;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          .print-actual-container {
            display: block !important;
          }

          .print-tag-page {
            width: 100mm !important;
            height: 15mm !important;
            display: flex !important;
            align-items: center !important;
            page-break-after: always !important;
            overflow: hidden !important;
            background: #fff !important;
          }

          .print-tag-body {
            width: 55mm !important; /* EXACT 55mm PRINTABLE AREA */
            height: 15mm !important;
            display: flex !important;
            padding: 0 2mm !important;
            box-sizing: border-box !important;
          }

          .print-section {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            overflow: hidden !important;
          }

          .print-left {
            font-size: 7.5pt !important;
            font-weight: 700 !important;
            line-height: 1.1 !important;
          }

          .print-field {
            white-space: nowrap !important;
          }

          .print-fold-gap {
            width: 2mm !important;
          }

          .print-right {
            text-align: center !important;
          }

          .print-cat {
            font-size: 8pt !important;
            font-weight: 900 !important;
            margin-bottom: 0.5mm !important;
          }

          .print-barcode {
            display: flex !important;
            justify-content: center !important;
            height: 7mm !important;
          }

          .print-val {
            font-size: 7pt !important;
            font-weight: 700 !important;
            font-family: monospace !important;
          }

          .print-tag-tail {
            width: 45mm !important; /* EXACT 45mm TAIL */
            height: 100% !important;
          }

          @page {
            size: 100mm 15mm !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
