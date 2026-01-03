# Preview Modal Implementation - Quick Guide

## What You Need to Do

Add **Save → Preview → Print** workflow to both Billing and Sales Booking pages.

---

## Step 1: Preview Component (Already Created ✅)

File: `src/components/common/InvoicePreview.tsx`

This component is ready to use!

---

## Step 2: Update Billing Page

### A. Add Import (at top of file):
```typescript
import InvoicePreview from "../../components/common/InvoicePreview";
import { Eye } from "lucide-react";
```

### B. Add State Variables (after other useState):
```typescript
const [showPreview, setShowPreview] = useState(false);
const [savedInvoiceData, setSavedInvoiceData] = useState<any>(null);
```

### C. Update handleSaveInvoice function:

**Replace this section:**
```typescript
// Show print confirmation dialog
const shouldPrint = window.confirm(
  "Invoice saved successfully!\n\nDo you want to print the invoice now?"
);

if (shouldPrint) {
  window.print();
}

// Ask if user wants to clear the bill
const shouldClear = window.confirm(
  "Do you want to clear the bill and start a new one?"
);
```

**With this:**
```typescript
// Save invoice data for preview
setSavedInvoiceData({
  ...invoiceData,
  totals,
  gstType,
  companySettings,
});

// Show preview modal
setShowPreview(true);
```

### D. Add these two new functions (after handleSaveInvoice):

```typescript
// Handle print from preview
const handlePrintInvoice = () => {
  setShowPreview(false);
  setTimeout(() => {
    window.print();
    
    setTimeout(() => {
      const shouldClear = window.confirm(
        "Do you want to clear the bill and start a new one?"
      );

      if (shouldClear) {
        setBranchStockCache(selectedBranch, []);
        clearBill();
        setBillItems([]);
        setCustomerName("");
        setCustomerPhone("");
        setSalespersonName("");
        loadBranchStock();
      }
    }, 500);
  }, 100);
};

// Close preview without printing
const handleClosePreview = () => {
  setShowPreview(false);
  
  const shouldClear = window.confirm(
    "Do you want to clear the bill and start a new one?"
  );

  if (shouldClear) {
    setBranchStockCache(selectedBranch, []);
    clearBill();
    setBillItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setSalespersonName("");
    loadBranchStock();
  }
};
```

### E. Add Preview Modal (before the closing `</>` tag):

```tsx
{/* Invoice Preview Modal */}
{showPreview && savedInvoiceData && (
  <InvoicePreview
    isOpen={showPreview}
    onClose={handleClosePreview}
    onPrint={handlePrintInvoice}
    title="📄 Invoice Preview"
  >
    <div className="space-y-6">
      {/* Company Header */}
      <div className="text-center border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          {companySettings?.companyName || "JEWELRY STORE"}
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          {companySettings?.address || "Address"}
        </p>
        <p className="text-sm text-gray-600">
          Phone: {companySettings?.phone || "Phone"} | GST: {companySettings?.gstNumber || "GST"}
        </p>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><strong>Invoice No:</strong> {savedInvoiceData.invoiceId}</p>
          <p><strong>Date:</strong> {new Date(savedInvoiceData.createdAt).toLocaleDateString()}</p>
          <p><strong>Branch:</strong> {savedInvoiceData.branch}</p>
        </div>
        <div>
          <p><strong>Customer:</strong> {savedInvoiceData.customerName}</p>
          <p><strong>Phone:</strong> {savedInvoiceData.customerPhone || "N/A"}</p>
          <p><strong>Salesperson:</strong> {savedInvoiceData.salespersonName}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left p-2">#</th>
            <th className="text-left p-2">Item</th>
            <th className="text-right p-2">Weight</th>
            <th className="text-right p-2">Price</th>
            <th className="text-right p-2">Discount</th>
            <th className="text-right p-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {savedInvoiceData.items.map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="p-2">{idx + 1}</td>
              <td className="p-2">{item.category}</td>
              <td className="text-right p-2">{item.weight}g</td>
              <td className="text-right p-2">₹{item.sellingPrice.toLocaleString()}</td>
              <td className="text-right p-2">₹{item.discount.toFixed(2)}</td>
              <td className="text-right p-2">₹{item.taxableAmount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t-2 border-gray-300 pt-4">
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{savedInvoiceData.totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>₹{savedInvoiceData.totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxable:</span>
              <span>₹{savedInvoiceData.totals.taxable.toFixed(2)}</span>
            </div>
            {gstType === "cgst_sgst" ? (
              <>
                <div className="flex justify-between">
                  <span>CGST ({gstSettings?.cgst}%):</span>
                  <span>₹{savedInvoiceData.totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST ({gstSettings?.sgst}%):</span>
                  <span>₹{savedInvoiceData.totals.sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>IGST ({gstSettings?.igst}%):</span>
                <span>₹{savedInvoiceData.totals.igst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t-2 border-gray-300 pt-2">
              <span>Grand Total:</span>
              <span>₹{savedInvoiceData.totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="text-sm">
        <strong>Amount in Words:</strong> {numberToWords(savedInvoiceData.totals.grandTotal)} Only
      </div>
    </div>
  </InvoicePreview>
)}
```

---

## Step 3: Update Sales Booking Page (Same Pattern)

### A. Add Import:
```typescript
import InvoicePreview from "../../components/common/InvoicePreview";
```

### B. Add State:
```typescript
const [showPreview, setShowPreview] = useState(false);
const [savedBookingData, setSavedBookingData] = useState<any>(null);
```

### C. Update handleSaveBooking - Replace the reset section with:
```typescript
// Save booking data for preview
setSavedBookingData({
  bookingNo,
  branch: selectedBranch,
  partyName,
  mobileNo,
  deliveryDate,
  salespersonName,
  items: bookingItems,
  totalAmount,
  netAmount,
  cashAdvance,
  pendingAmount,
  remarks,
  createdAt: new Date().toISOString(),
});

// Show preview modal
setShowPreview(true);
```

### D. Add Functions:
```typescript
const handlePrintBooking = () => {
  setShowPreview(false);
  setTimeout(() => {
    window.print();
    
    setTimeout(() => {
      const shouldClear = window.confirm(
        "Do you want to clear the booking and start a new one?"
      );

      if (shouldClear) {
        clearBooking();
        setPartyName("");
        setMobileNo("");
        setDeliveryDate("");
        setSalespersonName("");
        setBookingItems([]);
        setCashAdvance(0);
        setNetAmount(0);
        setPendingAmount(0);
        setTotalAmount(0);
        setRemarks("");
      }
    }, 500);
  }, 100);
};

const handleClosePreview = () => {
  setShowPreview(false);
  
  const shouldClear = window.confirm(
    "Do you want to clear the booking and start a new one?"
  );

  if (shouldClear) {
    clearBooking();
    setPartyName("");
    setMobileNo("");
    setDeliveryDate("");
    setSalespersonName("");
    setBookingItems([]);
    setCashAdvance(0);
    setNetAmount(0);
    setPendingAmount(0);
    setTotalAmount(0);
    setRemarks("");
  }
};
```

### E. Add Preview Modal (before closing `</>`):
```tsx
{/* Booking Preview Modal */}
{showPreview && savedBookingData && (
  <InvoicePreview
    isOpen={showPreview}
    onClose={handleClosePreview}
    onPrint={handlePrintBooking}
    title="📋 Booking Preview"
  >
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">SALES BOOKING</h1>
        <p className="text-sm text-gray-600 mt-2">Booking No: {savedBookingData.bookingNo}</p>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><strong>Branch:</strong> {savedBookingData.branch}</p>
          <p><strong>Party Name:</strong> {savedBookingData.partyName}</p>
          <p><strong>Mobile:</strong> {savedBookingData.mobileNo}</p>
        </div>
        <div>
          <p><strong>Date:</strong> {new Date(savedBookingData.createdAt).toLocaleDateString()}</p>
          <p><strong>Delivery Date:</strong> {savedBookingData.deliveryDate}</p>
          <p><strong>Salesperson:</strong> {savedBookingData.salespersonName}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left p-2">#</th>
            <th className="text-left p-2">Item Name</th>
            <th className="text-left p-2">Stone/Sapphire</th>
            <th className="text-center p-2">Pcs</th>
            <th className="text-right p-2">Weight</th>
            <th className="text-right p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {savedBookingData.items.map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="p-2">{idx + 1}</td>
              <td className="p-2">{item.itemName}</td>
              <td className="p-2">{item.stoneSapphire}</td>
              <td className="text-center p-2">{item.pieces}</td>
              <td className="text-right p-2">{item.weight}</td>
              <td className="text-right p-2">₹{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment Summary */}
      <div className="border-t-2 border-gray-300 pt-4">
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Items Total:</span>
              <span>₹{savedBookingData.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Net Amount:</span>
              <span>₹{savedBookingData.netAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Cash Advance:</span>
              <span>₹{savedBookingData.cashAdvance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t-2 border-gray-300 pt-2 text-red-600">
              <span>Pending Amount:</span>
              <span>₹{savedBookingData.pendingAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks */}
      {savedBookingData.remarks && (
        <div className="text-sm border-t border-gray-200 pt-4">
          <strong>Remarks:</strong> {savedBookingData.remarks}
        </div>
      )}
    </div>
  </InvoicePreview>
)}
```

---

## How It Works

### User Flow:
```
1. Fill form & add items
   ↓
2. Click "Save" button
   ↓
3. Data saves to Firebase
   ↓
4. Preview Modal opens automatically
   ↓
5. User reviews the document
   ↓
6. Click "Print" → Opens print dialog
   ↓
7. After print → Ask to clear form
```

### Benefits:
✅ **Review before print** - Catch errors
✅ **Professional preview** - Clean modal
✅ **Print anytime** - Can print multiple times
✅ **Clear workflow** - Save → Preview → Print
✅ **User control** - Choose to print or not

---

## Quick Implementation

Just copy-paste the code sections above into the respective files. The preview component is already created and ready to use!

Total time: ~5 minutes to implement both pages! 🚀
