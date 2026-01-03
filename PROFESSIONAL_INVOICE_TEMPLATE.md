# Professional Invoice Template - Implementation Guide

## ✅ UNIVERSAL STANDARD FORMAT

This is the **ONE FORMAT** for all invoices/bookings across the project.

---

## HTML Structure (Copy-Paste Ready)

### For BILLING/INVOICE:

```tsx
{/* Print Version - Hidden on screen */}
<div className="invoice-print">
  {/* SECTION 1: HEADER */}
  <div className="invoice-header">
    <div className="company-name">SUWARNASPARSH GEMS & JEWELLERY LTD</div>
    <div className="company-address">
      Shop No. 5, Ground Floor, Ravivar Peth<br/>
      Sangli - 416416, Maharashtra, India
    </div>
    <div className="company-gst">
      GSTIN: 27XXXXX1234X1ZX | State: Maharashtra (27)
    </div>
    <div className="document-type">TAX INVOICE (ORIGINAL)</div>
  </div>

  {/* SECTION 2: META INFO */}
  <div className="invoice-meta">
    <div className="invoice-meta-row">
      <div className="invoice-meta-label">Invoice No:</div>
      <div className="invoice-meta-value">{invoiceId}</div>
      <div className="invoice-meta-label">Date:</div>
      <div className="invoice-meta-value">{date}</div>
    </div>
    <div className="invoice-meta-row">
      <div className="invoice-meta-label">Branch:</div>
      <div className="invoice-meta-value">{branch}</div>
      <div className="invoice-meta-label">Salesperson:</div>
      <div className="invoice-meta-value">{salesperson}</div>
    </div>
    <div className="invoice-meta-row">
      <div className="invoice-meta-label">Party Name:</div>
      <div className="invoice-meta-value">{customerName}</div>
      <div className="invoice-meta-label">Mobile:</div>
      <div className="invoice-meta-value">{customerPhone}</div>
    </div>
  </div>

  {/* SECTION 3: ITEMS TABLE */}
  <table className="invoice-table">
    <thead>
      <tr>
        <th className="col-sno">#</th>
        <th className="col-item">ITEM NAME</th>
        <th className="col-hsn">HSN</th>
        <th className="col-remark">REMARK</th>
        <th className="col-pcs">PCS</th>
        <th className="col-weight">WEIGHT (g)</th>
        <th className="col-rate">RATE</th>
        <th className="col-amount">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      {billItems.map((item, idx) => (
        <tr key={idx}>
          <td className="col-sno">{idx + 1}</td>
          <td className="col-item">{item.category}</td>
          <td className="col-hsn">7113</td>
          <td className="col-remark">{item.subcategory || '-'}</td>
          <td className="col-pcs">1</td>
          <td className="col-weight">{item.weight}</td>
          <td className="col-rate">₹{item.sellingPrice.toLocaleString()}</td>
          <td className="col-amount">₹{item.taxableAmount.toFixed(2)}</td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* SECTION 4: TOTALS */}
  <div className="invoice-totals">
    <div className="invoice-totals-row subtotal">
      <div className="invoice-totals-label">Taxable Amount:</div>
      <div className="invoice-totals-value">₹{totals.taxable.toFixed(2)}</div>
    </div>
    {gstType === "cgst_sgst" ? (
      <>
        <div className="invoice-totals-row">
          <div className="invoice-totals-label">CGST @ {gstSettings?.cgst}%:</div>
          <div className="invoice-totals-value">₹{totals.cgst.toFixed(2)}</div>
        </div>
        <div className="invoice-totals-row">
          <div className="invoice-totals-label">SGST @ {gstSettings?.sgst}%:</div>
          <div className="invoice-totals-value">₹{totals.sgst.toFixed(2)}</div>
        </div>
      </>
    ) : (
      <div className="invoice-totals-row">
        <div className="invoice-totals-label">IGST @ {gstSettings?.igst}%:</div>
        <div className="invoice-totals-value">₹{totals.igst.toFixed(2)}</div>
      </div>
    )}
    <div className="invoice-totals-row total">
      <div className="invoice-totals-label">Net Amount:</div>
      <div className="invoice-totals-value">₹{totals.grandTotal.toFixed(2)}</div>
    </div>
  </div>

  {/* SECTION 5: PAYMENT (Optional) */}
  <div className="invoice-payment">
    <div className="invoice-payment-title">PAYMENT DETAILS</div>
    <div className="invoice-payment-row">
      <div>Cash Received:</div>
      <div>₹{cashReceived.toFixed(2)}</div>
    </div>
    <div className="invoice-payment-row">
      <div>Outstanding:</div>
      <div>₹{outstanding.toFixed(2)}</div>
    </div>
  </div>

  {/* SECTION 6: FOOTER */}
  <div className="invoice-footer">
    <div className="invoice-amount-words">
      <strong>Amount in Words:</strong> {numberToWords(totals.grandTotal)} Only
    </div>

    <div className="invoice-signatures">
      <div className="invoice-signature">
        <div className="invoice-signature-line">Customer Signature</div>
      </div>
      <div className="invoice-signature">
        <div className="invoice-signature-line">
          For {companySettings?.companyName || "SUWARNASPARSH GEMS & JEWELLERY LTD"}<br/>
          (Authorised Signatory)
        </div>
      </div>
    </div>
  </div>
</div>

{/* Screen Version - Hidden in print */}
<div className="no-print">
  {/* Your interactive UI here */}
</div>
```

---

### For SALES BOOKING:

```tsx
<div className="invoice-print">
  {/* SECTION 1: HEADER */}
  <div className="invoice-header">
    <div className="company-name">SUWARNASPARSH GEMS & JEWELLERY LTD</div>
    <div className="company-address">
      Shop No. 5, Ground Floor, Ravivar Peth<br/>
      Sangli - 416416, Maharashtra, India
    </div>
    <div className="document-type">SALES BOOKING</div>
  </div>

  {/* SECTION 2: META INFO */}
  <div className="invoice-meta">
    <div className="invoice-meta-row">
      <div className="invoice-meta-label">Booking No:</div>
      <div className="invoice-meta-value">{bookingNo}</div>
      <div className="invoice-meta-label">Date:</div>
      <div className="invoice-meta-value">{date}</div>
    </div>
    <div className="invoice-meta-row">
      <div className="invoice-meta-label">Branch:</div>
      <div className="invoice-meta-value">{branch}</div>
      <div className="invoice-meta-label">Delivery Date:</div>
      <div className="invoice-meta-value">{deliveryDate}</div>
    </div>
    <div className="invoice-meta-row">
      <div className="invoice-meta-label">Party Name:</div>
      <div className="invoice-meta-value">{partyName}</div>
      <div className="invoice-meta-label">Mobile:</div>
      <div className="invoice-meta-value">{mobileNo}</div>
    </div>
    <div className="invoice-meta-row">
      <div className="invoice-meta-label">Salesperson:</div>
      <div className="invoice-meta-value">{salesperson}</div>
      <div className="invoice-meta-label"></div>
      <div className="invoice-meta-value"></div>
    </div>
  </div>

  {/* SECTION 3: ITEMS TABLE */}
  <table className="invoice-table">
    <thead>
      <tr>
        <th className="col-sno">#</th>
        <th className="col-item">ITEM NAME</th>
        <th className="col-remark">STONE/SAPPHIRE</th>
        <th className="col-hsn">TR NO</th>
        <th className="col-pcs">PCS</th>
        <th className="col-weight">WEIGHT</th>
        <th className="col-amount">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      {bookingItems.map((item, idx) => (
        <tr key={idx}>
          <td className="col-sno">{idx + 1}</td>
          <td className="col-item">{item.itemName}</td>
          <td className="col-remark">{item.stoneSapphire}</td>
          <td className="col-hsn">{item.trNo}</td>
          <td className="col-pcs">{item.pieces}</td>
          <td className="col-weight">{item.weight}</td>
          <td className="col-amount">₹{item.total.toFixed(2)}</td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* SECTION 4: TOTALS */}
  <div className="invoice-totals">
    <div className="invoice-totals-row subtotal">
      <div className="invoice-totals-label">Items Total:</div>
      <div className="invoice-totals-value">₹{totalAmount.toFixed(2)}</div>
    </div>
    <div className="invoice-totals-row">
      <div className="invoice-totals-label">Net Amount:</div>
      <div className="invoice-totals-value">₹{netAmount.toFixed(2)}</div>
    </div>
    <div className="invoice-totals-row">
      <div className="invoice-totals-label">Cash Advance:</div>
      <div className="invoice-totals-value">₹{cashAdvance.toFixed(2)}</div>
    </div>
    <div className="invoice-totals-row total">
      <div className="invoice-totals-label">Pending Amount:</div>
      <div className="invoice-totals-value">₹{pendingAmount.toFixed(2)}</div>
    </div>
  </div>

  {/* SECTION 5: REMARKS */}
  {remarks && (
    <div className="invoice-payment">
      <div className="invoice-payment-title">REMARKS</div>
      <div>{remarks}</div>
    </div>
  )}

  {/* SECTION 6: FOOTER */}
  <div className="invoice-footer">
    <div className="invoice-signatures">
      <div className="invoice-signature">
        <div className="invoice-signature-line">Customer Signature</div>
      </div>
      <div className="invoice-signature">
        <div className="invoice-signature-line">
          For {companySettings?.companyName || "SUWARNASPARSH GEMS & JEWELLERY LTD"}<br/>
          (Authorised Signatory)
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## Key Features

### ✅ Professional Standards:
- A4 size (210mm × 297mm)
- 12-15mm margins
- Arial font family
- 9-10pt body text
- Clean borders (0.5pt)
- Proper spacing

### ✅ CA-Approved Layout:
- Clear header with company details
- GST number prominent
- Structured meta information
- Professional table format
- Right-aligned totals
- Signature section

### ✅ Print-Perfect:
- No clutter
- No icons in print
- Clean borders
- Proper alignment
- Single page optimization
- Professional appearance

---

## Implementation Steps

1. **Replace old print structure** with new `.invoice-print` div
2. **Use exact class names** as shown above
3. **Keep screen UI** in `.no-print` div
4. **Test print preview** (Ctrl+P)
5. **Verify PDF output**

---

## What This Fixes

❌ **Old Problems:**
- Scattered content
- Icons showing
- Poor alignment
- Unprofessional look
- Multiple pages

✅ **New Solution:**
- Clean layout
- Professional format
- Perfect alignment
- Single page
- Client-ready

---

## Next: Apply to Pages

1. Update `Billing.tsx` with invoice template
2. Update `SalesBooking.tsx` with booking template
3. Test both pages
4. Apply to reports if needed

The CSS is ready. Just copy the HTML structure! 🎯
