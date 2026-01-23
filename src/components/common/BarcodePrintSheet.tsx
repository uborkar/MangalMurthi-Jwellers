// src/components/common/BarcodePrintSheet.tsx - PREMIUM Thermal Label Preview
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
          SCREEM PREVIEW CONTAINER 
          This design simulates a physical thermal roll for a "WOW" effect
      */}
      <div className="roll-visualization no-print">
        <div className="roll-top"></div>
        <div className="thermal-roll">
          {items.map((item, index) => (
            <div key={index} className="preview-label-container">
              <div className="thermal-label-preview">
                {/* Physical Label Shape Visualization */}
                <div className="label-shape-overlay">
                  <div className="tag-loop"></div>
                  <div className="tag-body">
                    <div className="tag-content">
                      <div className="tag-left">
                        <div className="tag-category">{item.category.toUpperCase()}</div>
                        <div className="tag-remark">{item.remark || "Jewellery Item"}</div>
                        <div className="tag-meta">
                          <span>SN: #{item.serial}</span>
                          {item.design && <span>• {item.design}</span>}
                        </div>
                      </div>
                      <div className="tag-right">
                        <div className="tag-barcode-container">
                          <BarcodeView
                            value={item.barcodeValue}
                            height={28}
                            width={1.4}
                            displayValue={true}
                            fontSize={8}
                            margin={0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* This represents the perforation/gap between labels */}
              {index < items.length - 1 && <div className="perforation"></div>}
            </div>
          ))}
        </div>
        <div className="roll-bottom"></div>
      </div>

      {/* 
          ACTUAL PRINTING CONTAINER 
          This is what the printer sees - strictly 100mm x 15mm
      */}
      <div className="print-only-container">
        {items.map((item, index) => (
          <div key={`print-${index}`} className="strict-thermal-label">
            <div className="print-label-inner">
              <div className="print-left">
                <div className="print-category">{item.category.toUpperCase()}</div>
                <div className="print-remark">{item.remark || "Jewellery Item"}</div>
                <div className="print-meta">
                  <span>SN: #{item.serial}</span>
                  {item.design && <span> • {item.design}</span>}
                </div>
              </div>
              <div className="print-right">
                <div className="print-barcode">
                  <BarcodeView
                    value={item.barcodeValue}
                    height={32}
                    width={1.6}
                    displayValue={true}
                    fontSize={10}
                    margin={0}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        /* ================================================
           SCREEN PREVIEW STYLES (PREMIUM ROLL VIEW)
           ================================================ */
        .roll-visualization {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          perspective: 1000px;
          background: #f0f2f5;
          min-height: 80vh;
        }

        .thermal-roll {
          width: 500px; /* Wider for web visual but internal labels are correctly scaled */
          background: #ffffff;
          box-shadow: 0 20px 50px rgba(0,0,0,0.1), inset 0 0 20px rgba(0,0,0,0.02);
          position: relative;
          z-index: 2;
          border-left: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0;
        }

        .roll-top {
          width: 500px;
          height: 30px;
          background: linear-gradient(to bottom, #d1d5db, #ffffff);
          border-radius: 250px / 15px;
          margin-bottom: -15px;
          z-index: 3;
          box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }

        .roll-bottom {
          width: 500px;
          height: 40px;
          background: linear-gradient(to top, #d1d5db, #ffffff);
          border-radius: 250px / 20px;
          margin-top: -20px;
          z-index: 1;
        }

        .preview-label-container {
          padding: 20px 40px;
          transition: all 0.3s ease;
        }

        .thermal-label-preview {
          background: #fff;
          border: 1px dashed #ced4da;
          padding: 10px;
          border-radius: 4px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .preview-label-container:hover .thermal-label-preview {
          transform: scale(1.02) translateX(5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
          border-color: #3b82f6;
          border-style: solid;
        }

        /* Jewellery Item Tag Specific Visualization */
        .label-shape-overlay {
          display: flex;
          align-items: center;
        }

        .tag-loop {
          width: 60px;
          height: 12px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px 0 0 6px;
          border-right: none;
          position: relative;
        }

        .tag-loop::after {
          content: "";
          position: absolute;
          right: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: #fff;
          border-radius: 50%;
          border: 1px solid #e5e7eb;
        }

        .tag-body {
          flex: 1;
          height: 60px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0 8px 8px 0;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.02);
          padding: 10px 15px;
          display: flex;
          align-items: center;
        }

        .tag-content {
          display: flex;
          justify-content: space-between;
          width: 100%;
          align-items: center;
        }

        .tag-category {
          font-weight: 800;
          font-size: 14px;
          color: #1f2937;
          letter-spacing: 0.5px;
        }

        .tag-remark {
          font-size: 11px;
          color: #4b5563;
          margin-top: 2px;
        }

        .tag-meta {
          font-size: 9px;
          color: #9ca3af;
          margin-top: 4px;
          font-family: monospace;
        }

        .tag-right {
           margin-left: 20px;
        }

        .perforation {
          height: 1px;
          border-top: 2px dotted #e5e7eb;
          margin-top: 20px;
          width: 100%;
        }

        /* ================================================
           ACTUAL PRINT STYLES (STRICT 100mm x 15mm)
           ================================================ */
        .print-only-container {
          display: none;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          .print-only-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .strict-thermal-label {
            width: 100mm !important;
            height: 15mm !important;
            display: block !important;
            page-break-after: always !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            padding: 0 3mm !important;
            background: #fff !important;
          }

          .print-label-inner {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            height: 100% !important;
            width: 100% !important;
          }

          .print-left {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
          }

          .print-category {
            font-size: 10pt !important;
            font-weight: 900 !important;
            line-height: 1 !important;
            color: #000 !important;
            margin-bottom: 0.5mm !important;
          }

          .print-remark {
            font-size: 8pt !important;
            line-height: 1 !important;
            color: #000 !important;
            margin-bottom: 0.5mm !important;
            white-space: nowrap !important;
            overflow: hidden !important;
          }

          .print-meta {
            font-size: 6.5pt !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace !important;
          }

          .print-right {
            margin-left: 2mm !important;
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
