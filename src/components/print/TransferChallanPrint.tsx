// src/components/print/TransferChallanPrint.tsx - Safe Transfer Challan Print Component
import React from "react";
import { ShopTransferLog, ShopTransferRow } from "../../firebase/transfers";

interface TransferChallanPrintProps {
  log: ShopTransferLog;
}

export default function TransferChallanPrint({ log }: TransferChallanPrintProps) {
  const date = new Date(log.date);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h2>Transfer Challan</h2>
      <div>
        <strong>Transfer No:</strong> {log.transferNo}
      </div>
      <div>
        <strong>Date:</strong> {date.toLocaleString()}
      </div>
      <div>
        <strong>From:</strong> {log.fromShop}
      </div>
      <div>
        <strong>To:</strong> {log.toShop}
      </div>
      <br />

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #555", padding: "6px", fontSize: "14px" }}>Sr</th>
            <th style={{ border: "1px solid #555", padding: "6px", fontSize: "14px" }}>Label</th>
            <th style={{ border: "1px solid #555", padding: "6px", fontSize: "14px" }}>Barcode</th>
            <th style={{ border: "1px solid #555", padding: "6px", fontSize: "14px" }}>Category</th>
            <th style={{ border: "1px solid #555", padding: "6px", fontSize: "14px" }}>Location</th>
            <th style={{ border: "1px solid #555", padding: "6px", fontSize: "14px" }}>Type</th>
            <th style={{ border: "1px solid #555", padding: "6px", fontSize: "14px" }}>Weight (g)</th>
          </tr>
        </thead>
        <tbody>
          {log.rows.map((r: ShopTransferRow, i: number) => (
            <tr key={i}>
              <td style={{ border: "1px solid #555", padding: "6px" }}>{i + 1}</td>
              <td style={{ border: "1px solid #555", padding: "6px" }}>{r.label}</td>
              <td style={{ border: "1px solid #555", padding: "6px" }}>{r.barcode || "-"}</td>
              <td style={{ border: "1px solid #555", padding: "6px" }}>{r.category || "-"}</td>
              <td style={{ border: "1px solid #555", padding: "6px" }}>{r.location || "-"}</td>
              <td style={{ border: "1px solid #555", padding: "6px" }}>{r.type || "-"}</td>
              <td style={{ border: "1px solid #555", padding: "6px" }}>{r.weight || "-"}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} style={{ textAlign: "right", border: "1px solid #555", padding: "6px" }}>
              <strong>Total Items</strong>
            </td>
            <td style={{ border: "1px solid #555", padding: "6px" }}>{log.totals.totalQty}</td>
          </tr>
          <tr>
            <td colSpan={6} style={{ textAlign: "right", border: "1px solid #555", padding: "6px" }}>
              <strong>Total Weight</strong>
            </td>
            <td style={{ border: "1px solid #555", padding: "6px" }}>{log.totals.totalWeight} gms</td>
          </tr>
        </tbody>
      </table>

      <br />
      <div>
        <strong>Transport By:</strong> {log.transportBy || "-"}
      </div>
      <div>
        <strong>Remarks:</strong> {log.remarks || "-"}
      </div>

      {log.missingLabels && log.missingLabels.length > 0 && (
        <>
          <br />
          <div style={{ color: "red" }}>
            <strong>⚠️ Missing Items:</strong> {log.missingLabels.join(", ")}
          </div>
        </>
      )}

      <br />
      <br />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ borderTop: "1px solid #000", width: "200px", paddingTop: "5px" }}>
            Sender Signature
          </div>
        </div>
        <div>
          <div style={{ borderTop: "1px solid #000", width: "200px", paddingTop: "5px" }}>
            Receiver Signature
          </div>
        </div>
      </div>
    </div>
  );
}
