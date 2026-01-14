# 🔧 Remaining Print Fixes - Quick Reference

## ✅ Already Fixed
- **ShopTransfer.tsx** - Transfer challans now use safe React printing

## 🔴 Files Still Need Fixing

### 1. src/pages/Shops/Billing.tsx (Line 453)
**Current unsafe code:**
```typescript
const printWindow = window.open("", "_blank", "width=900,height=1200");
printWindow.document.write(htmlContent); // ❌ UNSAFE
```

**Fix needed:**
1. Import: `import { useRef } from "react"; import { useReactToPrint } from "react-to-print";`
2. Add state: `const [invoiceToPrint, setInvoiceToPrint] = useState(null);`
3. Add ref: `const printRef = useRef(null);`
4. Setup handler: `const handlePrint = useReactToPrint({ content: () => printRef.current });`
5. Replace `handlePrintInvoice` function to use `setInvoiceToPrint` + `handlePrint()`
6. Add hidden component: `<div style={{display:'none'}}><div ref={printRef}><InvoicePrint data={invoiceToPrint} /></div></div>`

---

### 2. src/pages/Shops/SalesBooking.tsx (Line 369)
**Current unsafe code:**
```typescript
const printWindow = window.open("", "_blank", "width=900,height=1200");
printWindow.document.write(htmlContent); // ❌ UNSAFE
```

**Fix needed:** Same pattern as Billing.tsx

---

### 3. src/pages/Shops/ShopExpense.tsx (Line 314)
**Current unsafe code:**
```typescript
const printWindow = window.open("", "_blank", "width=800,height=600");
printWindow.document.write(htmlContent); // ❌ UNSAFE
```

**Fix needed:**
1. Use `ExpenseReportPrint` component (already created)
2. Follow same pattern as ShopTransfer.tsx

---

### 4. src/pages/Warehouse/Tagging.tsx (Line 209)
**Current unsafe code:**
```typescript
const printWindow = window.open("/print-barcodes", "_blank");
```

**Fix needed:**
This one is different - it opens a separate route `/print-barcodes`
- Check if `/print-barcodes` route exists
- If it's a separate page, that page might also need fixing
- Or replace with inline barcode print component

---

## 🚀 Quick Fix Template

For ANY file with `window.open()` print:

```typescript
// 1. ADD IMPORTS
import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import YourPrintComponent from "../../components/print/YourPrintComponent";

// 2. ADD STATE & REF (inside component)
const [dataToPrint, setDataToPrint] = useState(null);
const printRef = useRef(null);

// 3. SETUP PRINT HANDLER
const handlePrint = useReactToPrint({
  content: () => printRef.current,
  documentTitle: "Document Name",
});

// 4. REPLACE OLD PRINT FUNCTION
const handlePrintDocument = () => {
  setDataToPrint(yourData);
  setTimeout(() => handlePrint(), 100);
};

// 5. ADD HIDDEN COMPONENT (in JSX return)
return (
  <>
    {/* Your existing UI */}
    <button onClick={handlePrintDocument}>Print</button>

    {/* Hidden print content */}
    <div style={{ display: "none" }}>
      <div ref={printRef}>
        {dataToPrint && <YourPrintComponent data={dataToPrint} />}
      </div>
    </div>
  </>
);
```

---

## 📝 Notes

- The `setTimeout` is needed to ensure state updates before printing
- `display: "none"` hides the component but keeps it in DOM for printing
- `react-to-print` handles all the print dialog logic safely
- No more Trusted Types errors!

---

## ⚡ Priority Order

1. **Billing.tsx** - Most critical (customer invoices)
2. **SalesBooking.tsx** - Important (booking receipts)
3. **ShopExpense.tsx** - Medium (internal reports)
4. **Tagging.tsx** - Check if route-based or needs inline fix

---

## 🎯 Expected Result

After all fixes:
- ✅ No console errors about TrustedScript
- ✅ Print dialogs open correctly
- ✅ All documents print properly
- ✅ Works in all browsers
- ✅ Secure against XSS attacks
