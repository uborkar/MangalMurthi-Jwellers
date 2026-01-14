// src/pages/PrintChallan.tsx - Dedicated Print Page for Transfer Challans
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShopTransferLog, ShopTransferRow } from "../firebase/transfers";

export default function PrintChallan() {
  const [challan, setChallan] = useState<ShopTransferLog | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get challan data from localStorage
    const stored = localStorage.getItem("print_challan");
    if (stored) {
      const data = JSON.parse(stored);
      setChallan(data);
      
      // Auto-print after a short delay
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, []);

  const handleClose = () => {
    localStorage.removeItem("print_challan");
    window.close();
    // If window.close() doesn't work (same tab), navigate back
    setTimeout(() => navigate(-1), 100);
  };

  if (!challan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Challan Data</h2>
          <p className="text-gray-600 mb-4">Please generate a challan first.</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const date = new Date(challan.date);

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Transfer Challan</h1>
            <p className="text-sm text-gray-600">{challan.transferNo}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div className="max-w-4xl mx-auto p-8 bg-white">
        <style>{`
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            @page { size: A4; margin: 10mm; }
          }
        `}</style>

        <div className="print-content">
          <h2 className="text-2xl font-bold mb-4">Transfer Challan</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Transfer No</p>
              <p className="font-semibold">{challan.transferNo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold">{date.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">From Shop</p>
              <p className="font-semibold">{challan.fromShop}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">To Shop</p>
              <p className="font-semibold">{challan.toShop}</p>
            </div>
          </div>

          <table className="w-full border-collapse border border-gray-400 mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-2 text-left">Sr</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Label</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Barcode</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Category</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Location</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Type</th>
                <th className="border border-gray-400 px-3 py-2 text-left">Weight (g)</th>
              </tr>
            </thead>
            <tbody>
              {challan.rows.map((row: ShopTransferRow, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-400 px-3 py-2">{index + 1}</td>
                  <td className="border border-gray-400 px-3 py-2">{row.label}</td>
                  <td className="border border-gray-400 px-3 py-2">{row.barcode || "-"}</td>
                  <td className="border border-gray-400 px-3 py-2">{row.category || "-"}</td>
                  <td className="border border-gray-400 px-3 py-2">{row.location || "-"}</td>
                  <td className="border border-gray-400 px-3 py-2">{row.type || "-"}</td>
                  <td className="border border-gray-400 px-3 py-2">{row.weight || "-"}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={6} className="border border-gray-400 px-3 py-2 text-right">
                  Total Items
                </td>
                <td className="border border-gray-400 px-3 py-2">{challan.totals.totalQty}</td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={6} className="border border-gray-400 px-3 py-2 text-right">
                  Total Weight
                </td>
                <td className="border border-gray-400 px-3 py-2">{challan.totals.totalWeight} gms</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-6">
            <p className="mb-2">
              <strong>Transport By:</strong> {challan.transportBy || "-"}
            </p>
            <p className="mb-2">
              <strong>Remarks:</strong> {challan.remarks || "-"}
            </p>
          </div>

          {challan.missingLabels && challan.missingLabels.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold">⚠️ Missing Items:</p>
              <p className="text-red-700">{challan.missingLabels.join(", ")}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div>
              <div className="border-t-2 border-gray-800 pt-2 mt-16">
                <p className="text-center font-semibold">Sender Signature</p>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-gray-800 pt-2 mt-16">
                <p className="text-center font-semibold">Receiver Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
