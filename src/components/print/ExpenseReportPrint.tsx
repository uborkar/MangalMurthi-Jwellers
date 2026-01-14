// src/components/print/ExpenseReportPrint.tsx - Safe Expense Report Print Component
import React from "react";

interface ExpenseReportPrintProps {
  expenses: any[];
  shopName?: string;
  dateRange?: { from: string; to: string };
  totals?: {
    totalAmount: number;
    count: number;
  };
}

export default function ExpenseReportPrint({
  expenses,
  shopName,
  dateRange,
  totals,
}: ExpenseReportPrintProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <style>
        {`
          @media print {
            body { margin: 0; padding: 20px; }
            @page { size: A4; margin: 10mm; }
          }
          table { width: 100%; borderCollapse: collapse; marginTop: 15px; }
          th, td { border: 1px solid #555; padding: 6px; fontSize: 13px; }
          th { backgroundColor: #e0e0e0; fontWeight: bold; textAlign: left; }
          .header { textAlign: center; marginBottom: 20px; }
          .title { fontSize: 20px; fontWeight: bold; marginBottom: 10px; }
          .info { marginBottom: 5px; }
          .total-row { fontWeight: bold; backgroundColor: #f5f5f5; }
        `}
      </style>

      <div className="header">
        <div className="title">Expense Report</div>
        {shopName && <div className="info"><strong>Shop:</strong> {shopName}</div>}
        {dateRange && (
          <div className="info">
            <strong>Period:</strong> {dateRange.from} to {dateRange.to}
          </div>
        )}
        <div className="info">
          <strong>Generated:</strong> {new Date().toLocaleString()}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Sr</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{new Date(expense.date).toLocaleDateString()}</td>
              <td>{expense.category || "-"}</td>
              <td>{expense.description || "-"}</td>
              <td style={{ textAlign: "right" }}>₹{expense.amount || 0}</td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: "right" }}>
                Total ({totals.count} expenses):
              </td>
              <td style={{ textAlign: "right" }}>₹{totals.totalAmount}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
