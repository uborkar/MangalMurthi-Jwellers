# Print Function Double Window Issue - FIXED

## Problem
When clicking print buttons anywhere in the project, two windows were opening - one inside the other. This was caused by incorrect print implementation patterns.

## Root Cause
The issue occurred in files that used this pattern:
1. Create a new window with `window.open()`
2. Create an iframe inside that window  
3. Try to print from the iframe

This resulted in:
- A popup window opening
- An iframe being created inside that popup
- The print dialog showing for the iframe
- Confusing UX with nested windows

## Solution
Changed the pattern to directly write HTML to the print window:

### ❌ Old Problematic Approach
```typescript
const printWindow = window.open("", "_blank", "width=800,height=600");
// ... generate HTML ...

// Creating iframe inside the window (WRONG!)
const printFrame = printWindow.document.createElement('iframe');
printFrame.srcdoc = html;
printWindow.document.body.appendChild(printFrame);
printFrame.onload = () => {
  printFrame.contentWindow?.print(); // Nested print
};
```

### ✅ New Correct Approach
```typescript
const printWindow = window.open("", "_blank", "width=800,height=600");
// ... generate HTML ...

// Write directly to window (CORRECT!)
printWindow.document.write(html);
printWindow.document.close();
// The HTML includes auto-print script
```

## Files Fixed

### 1. `src/pages/Shops/ShopExpense.tsx`
- **Function**: `handlePrint()`
- **Fix**: Removed iframe creation, now uses `document.write()` directly
- **Lines Changed**: 451-466

### 2. `src/pages/Shops/ShopExpenseReport.tsx`  
- **Function**: `exportToPDF()`
- **Status**: Already using `document.write()` correctly
- **No changes needed**

### 3. `src/pages/Shops/SalesBooking.tsx`
- **Function**: `handlePrintBooking()`
- **Status**: Already using `document.write()` correctly
- **No changes needed**

### 4. `src/pages/Shops/Billing.tsx`
- **Function**: `handlePrintInvoice()`
- **Status**: Uses `printDocument()` utility which creates iframe in CURRENT page (not a new window)
- **No changes needed**

## Summary of Correct Patterns

### Pattern 1: New Window + Direct Write (✅ RECOMMENDED for popups)
```typescript
const printWindow = window.open("", "_blank");
printWindow.document.write(htmlContent);
printWindow.document.close();
```

### Pattern 2: Iframe in Current Page (✅ RECOMMENDED for same-page)
```typescript
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
document.body.appendChild(iframe);
iframe.contentWindow.document.write(htmlContent);
iframe.contentWindow.print();
```

### Pattern 3: Popup + Iframe (❌ AVOID - causes double windows)
```typescript
const printWindow = window.open("");
const iframe = printWindow.document.createElement('iframe'); // DON'T!
```

## Testing Checklist
- [x] Shop Expense Daily Report print
- [x] Shop Expense Report PDF export  
- [x] Sales Booking print
- [x] Billing invoice print
- [ ] Any other print functions in the app

## Result
✅ Fixed - Only ONE window opens when printing
✅ Clean print dialog experience
✅ No nested window confusion

---
**Date Fixed**: 2026-01-17
**Issue**: Double windows opening on print
**Status**: RESOLVED
