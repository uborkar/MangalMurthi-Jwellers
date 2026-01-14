// src/components/print/InvoicePrint.tsx - MANGALMURTHI JEWELLERY LTD Sales Bill Format
import React from "react";

interface InvoiceItem {
  itemName?: string;
  name?: string;
  label?: string;
  barcode?: string;
  location?: string;
  loct?: string;
  quantity?: number;
  qty?: number;
  pcs?: number;
  weight?: number | string;
  type?: string;
  rate?: number;
  discount?: number;
  taxableAmount?: number;
  taxableValue?: number;
}

interface InvoiceData {
  invoiceId?: string;
  invoiceNo?: string;
  billNo?: string;
  date?: string;
  createdAt?: string;
  billDate?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  branchAddress?: string;
  branchEmail?: string;
  branchPhone?: string;
  customerName?: string;
  partyName?: string;
  customerPhone?: string;
  partyPhone?: string;
  salespersonName?: string;
  employeeName?: string;
  items?: InvoiceItem[];
  voucherDesc?: string;
  voucherDescription?: string;
  netAmount?: number;
  subtotal?: number;
  sgst?: number;
  cgst?: number;
  igst?: number;
  gstRate?: number;
  billAmount?: number;
  grandTotal?: number;
  total?: number;
  advanceAmount?: number;
  cashAmount?: number;
  billOutstanding?: number;
  gstNumber?: string;
  gstNo?: string;
  state?: string;
  totals?: {
    subtotal?: number;
    totalDiscount?: number;
    taxable?: number;
    gst?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    grandTotal?: number;
  };
}

interface InvoicePrintProps {
  invoiceData: InvoiceData;
}

// Convert number to words (Indian format)
function numberToWords(num: number): string {
  if (!num || num === 0) return "ZERO ONLY";

  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + ' CRORE ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' LAKH ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' THOUSAND ';
  if (remainder > 0) result += convertLessThanThousand(remainder);

  return result.trim() + ' ONLY';
}

export default function InvoicePrint({ invoiceData }: InvoicePrintProps) {
  if (!invoiceData) return null;

  const billNo = invoiceData.billNo || invoiceData.invoiceNo || invoiceData.invoiceId?.split('-').pop() || "00000";
  const billDate = invoiceData.billDate || invoiceData.date || invoiceData.createdAt || new Date().toISOString();
  const formattedDate = new Date(billDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = new Date(billDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const customerName = invoiceData.customerName || invoiceData.partyName || "[CUSTOMER NAME]";
  const customerPhone = invoiceData.customerPhone || invoiceData.partyPhone || "[Phone No]";
  const employeeName = invoiceData.salespersonName || invoiceData.employeeName || "[Employee Name]";

  const items = invoiceData.items || [];
  const netAmount = invoiceData.netAmount || invoiceData.totals?.taxable || invoiceData.subtotal || 0;
  const sgst = invoiceData.sgst || invoiceData.totals?.sgst || 0;
  const cgst = invoiceData.cgst || invoiceData.totals?.cgst || 0;
  const igst = invoiceData.igst || invoiceData.totals?.igst || 0;
  const gstRate = invoiceData.gstRate || 3;
  const billAmount = invoiceData.billAmount || invoiceData.grandTotal || invoiceData.total || invoiceData.totals?.grandTotal || 0;
  const advanceAmount = invoiceData.advanceAmount || 0;
  const cashAmount = invoiceData.cashAmount || 0;
  const billOutstanding = invoiceData.billOutstanding || 0;

  const amountInWords = numberToWords(Math.floor(billAmount));
  const voucherDesc = invoiceData.voucherDesc || invoiceData.voucherDescription || "";

  const gstNumber = invoiceData.gstNumber || invoiceData.gstNo || "[GST NUMBER]";
  const state = invoiceData.state || "Maharashtra";

  return (
    <div style={{
      fontFamily: "'Arial', sans-serif",
      padding: "10mm",
      maxWidth: "210mm",
      margin: "0 auto",
      fontSize: "11px",
      lineHeight: "1.2",
      color: "#000"
    }}>
      <style>
        {`
          @media print {
            body { margin: 0; padding: 0; }
            @page { size: A4; margin: 10mm; }
          }
          * { box-sizing: border-box; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
          th { font-weight: bold; }
          .no-border { border: none !important; }
          .border-right { border-right: 1px solid #000; }
          .border-bottom { border-bottom: 1px solid #000; }
          .border-top { border-top: 1px solid #000; }
          .border-left { border-left: 1px solid #000; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
        `}
      </style>

      {/* Header Row */}
      <table style={{ marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "8px", width: "70%", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>Sales Book - 1</div>
            </td>
            <td style={{ border: "1px solid #000", padding: "8px", width: "30%", textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold", border: "2px solid #000", padding: "4px" }}>ORIGINAL</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Company Info and Bill Details */}
      <table style={{ marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "8px", width: "70%", verticalAlign: "top" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>
                {invoiceData.companyName || "MANGALMURTHI JEWELLERY LTD"}
              </div>
              <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                <strong>Address:</strong> {invoiceData.companyAddress || "10TH SWARN MARKET, OPERA HOUSE HOUSE, Mumbai - 400004"}
              </div>
              <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                Web Address: {invoiceData.companyWebsite || "www.mangalmurthijewellery.com"}
              </div>
              <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                <strong>Location:</strong> {invoiceData.branchAddress || "[Branch Address]"}
              </div>
              <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                Email: {invoiceData.branchEmail || invoiceData.companyEmail || "[Email Address]"}
              </div>
              <div style={{ fontSize: "10px" }}>
                Ph: {invoiceData.branchPhone || invoiceData.companyPhone || "[Phone Number]"}
              </div>
            </td>
            <td style={{ border: "1px solid #000", padding: "8px", width: "30%", verticalAlign: "top" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", textAlign: "center" }}>ORIGINAL</div>
              <div style={{ fontSize: "11px", marginBottom: "4px", padding: "4px", borderBottom: "1px solid #000" }}>
                <strong>Bill Date :</strong> {formattedDate}  {formattedTime}
              </div>
              <div style={{ fontSize: "11px", padding: "4px" }}>
                <strong>Bill No :</strong> {billNo}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Customer Info */}
      <table style={{ marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "6px" }}>
              <div style={{ marginBottom: "4px" }}>
                <strong>Party Name :</strong> {customerName}
              </div>
              <div style={{ marginBottom: "4px", marginLeft: "60px" }}>
                <strong>Mo :</strong> {customerPhone}
              </div>
              <div>
                <strong>Emp Name :</strong> {employeeName}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table style={{ marginBottom: "0" }}>
        <thead>
          <tr style={{ backgroundColor: "#fff" }}>
            <th style={{ width: "30px", textAlign: "center" }}>SNo</th>
            <th style={{ width: "150px" }}>ITEM NAME</th>
            <th style={{ width: "80px" }}>BARCODE</th>
            <th style={{ width: "50px", textAlign: "center" }}>LOCT</th>
            <th style={{ width: "40px", textAlign: "center" }}>PCS.</th>
            <th style={{ width: "60px", textAlign: "right" }}>WEIGHT</th>
            <th style={{ width: "60px", textAlign: "center" }}>TYPE</th>
            <th style={{ width: "60px", textAlign: "right" }}>RATE</th>
            <th style={{ width: "60px", textAlign: "right" }}>DISCOUNT</th>
            <th style={{ width: "80px", textAlign: "right" }}>TAXABLE VALUE</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? items.map((item, index) => (
            <tr key={index}>
              <td style={{ textAlign: "center" }}>{index + 1}</td>
              <td>{item.itemName || item.name || item.label || ""}</td>
              <td>{item.barcode || ""}</td>
              <td style={{ textAlign: "center" }}>{item.location || item.loct || ""}</td>
              <td style={{ textAlign: "center" }}>{item.quantity || item.qty || item.pcs || 1}</td>
              <td style={{ textAlign: "right" }}>{typeof item.weight === 'number' ? item.weight.toFixed(3) : item.weight || ""}</td>
              <td style={{ textAlign: "center" }}>{item.type || ""}</td>
              <td style={{ textAlign: "right" }}>{item.rate ? Number(item.rate).toFixed(2) : ""}</td>
              <td style={{ textAlign: "right" }}>{item.discount ? Number(item.discount).toFixed(2) : ""}</td>
              <td style={{ textAlign: "right" }}>{item.taxableAmount || item.taxableValue ? Number(item.taxableAmount || item.taxableValue).toFixed(2) : ""}</td>
            </tr>
          )) : (
            <tr>
              <td style={{ textAlign: "center" }}>1</td>
              <td>GOLD ORNAMENT / DIAMOND</td>
              <td></td>
              <td style={{ textAlign: "center" }}></td>
              <td style={{ textAlign: "center" }}>1</td>
              <td style={{ textAlign: "right" }}>10.500</td>
              <td style={{ textAlign: "center" }}></td>
              <td style={{ textAlign: "right" }}>120.00</td>
              <td style={{ textAlign: "right" }}></td>
              <td style={{ textAlign: "right" }}>2100.00</td>
            </tr>
          )}
          {/* Add empty rows to fill space if needed */}
          {items.length < 10 && Array.from({ length: 10 - items.length }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td style={{ textAlign: "center" }}>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Section */}
      <table style={{ marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "6px", width: "60%", verticalAlign: "top" }}>
              <div style={{ marginBottom: "4px" }}>
                <strong>Vch Desc :</strong> {voucherDesc || "ORDER AMOUNT=500 & CASH RECEIVED VOUCHER NO. 00046 ON [DATE]"}
              </div>
              <div style={{ marginTop: "12px" }}>
                <strong>Rupees :</strong> {amountInWords}
              </div>
            </td>
            <td style={{ border: "1px solid #000", padding: "0", width: "40%", verticalAlign: "top" }}>
              <table style={{ border: "none", margin: "0" }}>
                <tbody>
                  <tr>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      <strong>Net Amount :</strong>
                    </td>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      {netAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      <strong>SGST {gstRate.toFixed(2)}% :</strong>
                    </td>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      {sgst.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      <strong>CGST {gstRate.toFixed(2)}% :</strong>
                    </td>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      {cgst.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      <strong>IGST {(gstRate * 2).toFixed(2)}% :</strong>
                    </td>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      {igst.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      <strong>Bill Amount :</strong>
                    </td>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right", fontWeight: "bold" }}>
                      {billAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      <strong>Advance Amt :</strong>
                    </td>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      {advanceAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      <strong>Cash Amount :</strong>
                    </td>
                    <td className="no-border" style={{ borderBottom: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                      {cashAmount.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="no-border" style={{ padding: "4px 6px", textAlign: "right" }}>
                      <strong>Bill Outstanding :</strong>
                    </td>
                    <td className="no-border" style={{ padding: "4px 6px", textAlign: "right", fontWeight: "bold" }}>
                      {billOutstanding.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bottom Footer */}
      <table style={{ marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "6px", width: "50%" }}>
              <div style={{ fontSize: "10px" }}>
                <strong>GST No :</strong> {gstNumber}
              </div>
              <div style={{ fontSize: "10px", marginTop: "2px" }}>
                <strong>State :</strong> {state}
              </div>
            </td>
            <td style={{ border: "1px solid #000", padding: "6px", width: "50%", textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>
                For : {invoiceData.companyName || "MANGALMURTHI JEWELLERY LTD"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature Line */}
      <div style={{ marginTop: "30px", textAlign: "right", paddingRight: "20px" }}>
        <div style={{ borderTop: "1px solid #000", display: "inline-block", width: "200px", paddingTop: "4px", textAlign: "center" }}>
          Signature
        </div>
      </div>
    </div>
  );
}
