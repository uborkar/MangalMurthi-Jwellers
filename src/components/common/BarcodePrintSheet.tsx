// src/components/common/BarcodePrintSheet.tsx - PROFESSIONAL Thermal Label (100mm x 15mm)
// Matches EXACT format from product images - Clean, Vertical Layout
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
      {/* Thermal Labels Container */}
      <div className="thermal-labels-wrapper">
        {items.map((item, index) => (
          <div key={index} className="thermal-label-page">
            {/* PROFESSIONAL VERTICAL LAYOUT - Like Product Image */}
            <div className="label-content">

              {/* Top Section - Item Details (Vertical Stack) */}
              <div className="label-header">
                <div className="category-name">{item.category.toUpperCase()}</div>
                {item.remark && (
                  <div className="item-description">{item.remark}</div>
                )}
              </div>

              {/* Middle Section - Metadata */}
              <div className="label-metadata">
                <div className="meta-row">
                  <span className="meta-label">Item:</span>
                  <span className="meta-value">#{item.serial}</span>
                </div>
                {item.design && (
                  <div className="meta-row">
                    <span className="meta-label">Design:</span>
                    <span className="meta-value">{item.design}</span>
                  </div>
                )}
                {item.type && (
                  <div className="meta-row">
                    <span className="meta-label">Type:</span>
                    <span className="meta-value">{item.type}</span>
                  </div>
                )}
              </div>

              {/* Bottom Section - Barcode (Full Width) */}
              <div className="label-barcode-section">
                <BarcodeView
                  value={item.barcodeValue}
                  height={30}
                  width={2}
                  displayValue={true}
                  fontSize={10}
                  margin={2}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PROFESSIONAL THERMAL LABEL STYLES */}
      <style jsx>{`
        /* ================================================
           SCREEN PREVIEW - Shows labels in queue
           ================================================ */
        .thermal-labels-wrapper {
          width: 100%;
          max-width: 100mm;
          margin: 0 auto;
          background: #f8f9fa;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 5mm;
        }

        .thermal-label-page {
          width: 100mm;
          height: 15mm;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 2mm;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          page-break-after: always;
          page-break-inside: avoid;
          overflow: hidden;
        }

        .label-content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5mm 3mm;
          box-sizing: border-box;
        }

        /* HEADER - Category & Description */
        .label-header {
          display: flex;
          flex-direction: column;
          gap: 0.5mm;
        }

        .category-name {
          font-size: 9pt;
          font-weight: 700;
          color: #000;
          letter-spacing: 0.3pt;
          line-height: 1;
          text-transform: uppercase;
        }

        .item-description {
          font-size: 7pt;
          color: #333;
          line-height: 1.1;
          font-weight: 500;
        }

        /* METADATA - Item Info */
        .label-metadata {
          display: flex;
          gap: 3mm;
          font-size: 6pt;
          color: #666;
          line-height: 1;
        }

        .meta-row {
          display: flex;
          gap: 1mm;
          align-items: baseline;
        }

        .meta-label {
          color: #888;
          font-weight: 400;
        }

        .meta-value {
          color: #333;
          font-weight: 600;
        }

        /* BARCODE SECTION - Full Width */
        .label-barcode-section {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          margin-top: auto;
        }

        .label-barcode-section svg {
          max-width: 94mm;
          height: auto;
        }

        /* Hover effect on screen */
        .thermal-label-page:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0,123,255,0.15);
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }

        /* ================================================
           PRINT STYLES - CRITICAL FOR THERMAL PRINTER
           ================================================ */
        @media print {
          /* Reset everything */
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          html, body {
            width: 100mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything except labels */
          body > *:not(.thermal-labels-wrapper) {
            display: none !important;
          }

          /* Labels wrapper - vertical queue */
          .thermal-labels-wrapper {
            display: block !important;
            width: 100mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            gap: 0 !important;
          }

          /* Individual Label Page - EXACT 100mm x 15mm */
          .thermal-label-page {
            width: 100mm !important;
            height: 15mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            display: block !important;
            page-break-before: auto !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }

          /* Last label - no page break */
          .thermal-label-page:last-child {
            page-break-after: avoid !important;
          }

          /* Label Content Container */
          .label-content {
            width: 100mm !important;
            height: 15mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 1.5mm 3mm !important;
            box-sizing: border-box !important;
            background: white !important;
          }

          /* HEADER Section */
          .label-header {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5mm !important;
            flex-shrink: 0 !important;
          }

          .category-name {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            font-size: 9pt !important;
            font-weight: 700 !important;
            color: #000 !important;
            letter-spacing: 0.3pt !important;
            line-height: 1 !important;
            text-transform: uppercase !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .item-description {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            font-size: 7pt !important;
            color: #000 !important;
            line-height: 1.1 !important;
            font-weight: 500 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* METADATA Section */
          .label-metadata {
            display: flex !important;
            gap: 3mm !important;
            font-size: 6pt !important;
            line-height: 1 !important;
            flex-shrink: 0 !important;
          }

          .meta-row {
            display: flex !important;
            gap: 1mm !important;
            align-items: baseline !important;
          }

          .meta-label {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            color: #666 !important;
            font-weight: 400 !important;
          }

          .meta-value {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            color: #000 !important;
            font-weight: 600 !important;
          }

          /* BARCODE Section - Full Width */
          .label-barcode-section {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-end !important;
            margin-top: auto !important;
            flex-shrink: 0 !important;
            height: 7mm !important;
          }

          .label-barcode-section svg {
            max-width: 94mm !important;
            height: 6mm !important;
            display: block !important;
          }

          /* Page Setup - CRITICAL for thermal printer */
          @page {
            size: 100mm 15mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* First page settings */
          @page :first {
            margin: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
