# Sales & Returns Management - Proper Separation

## Overview
The billing system properly maintains **separate collections** for fresh sales invoices and sales return bills to ensure clean data management and accurate reporting.

---

## 📊 Data Structure Separation

### 1. **Fresh Sales Invoices**
**Firestore Path:** `shops/{branch}/invoices/{invoiceId}`

**Document Structure:**
```typescript
{
  invoiceId: "INV-{branch}-{timestamp}",
  branch: string,
  customerName: string,
  customerPhone: string,
  salespersonName: string,
  items: Array<{
    barcode, category, subcategory, location, type, weight,
    costPrice, sellingPrice, discount, taxableAmount
  }>,
  totals: {
    subtotal, totalDiscount, taxable,
    cgst, sgst, igst, gst, grandTotal,
    creditAdjustment, finalAmount
  },
  isExchangeBill: boolean,
  exchangeCredit?: number,  // Only present if isExchangeBill = true
  gstType: "cgst_sgst" | "igst",
  gstSettings: { cgst, sgst, igst },
  createdAt: ISO timestamp,
  
  // Return tracking (added when items are returned)
  hasReturns?: boolean,
  returnIds?: string[],
  returnedItemBarcodes?: string[]
}
```

**Key Points:**
- ✅ Each fresh sale creates a new document in `invoices` collection
- ✅ Exchange bills are marked with `isExchangeBill: true` and include `exchangeCredit`
- ✅ Regular bills do NOT have `exchangeCredit` field (conditionally omitted)
- ✅ Return tracking is added later when items are returned

---

### 2. **Sales Return Bills**
**Firestore Path:** `shops/{branch}/salesReturns/{returnDocId}`

**Document Structure:**
```typescript
{
  returnId: "RET-{branch}-{timestamp}",
  originalInvoiceId: string,  // Reference to original invoice
  branch: string,
  customerName: string,
  customerPhone: string,
  returnDate: ISO timestamp,
  processedBy: string,  // Salesperson who processed return
  
  returnedItems: Array<{
    barcode, category, subcategory, location, type, weight,
    originalPrice, originalDiscount,
    returnRate: 50,  // Always 50%
    returnAmount: originalPrice * 0.5,
    returnReason: string,
    remarks: string,
    stockStatus: "returned-to-inventory" | "damaged" | "sent-to-warehouse"
  }>,
  
  calculations: {
    totalOriginalValue: number,
    totalReturnValue: number,  // 50% of original
    returnRate: 50,
    cgst: number,  // Calculated but NOT added to credit
    sgst: number,  // Calculated but NOT added to credit
    igst: number,  // Calculated but NOT added to credit
    totalCreditAmount: number  // Just 50% return value
  },
  
  settlementType: "exchange" | "refund" | "store-credit",
  status: "completed" | "pending" | "cancelled",
  
  // Exchange details (if settlementType = "exchange")
  exchangeInvoiceId?: string,  // New invoice created for exchange
  newBillTotal?: number,
  creditAdjusted?: number,
  balanceAmount?: number,
  
  createdAt: ISO timestamp
}
```

**Key Points:**
- ✅ Completely separate collection from invoices
- ✅ Links back to original invoice via `originalInvoiceId`
- ✅ Tracks return-specific data (reasons, return rate, settlement type)
- ✅ Status tracking for exchange flows

---

## 🔄 Workflow Separation

### **Fresh Sale Flow**
```
1. User adds items to bill
2. User enters customer details
3. User clicks "Save Invoice"
4. System:
   - Marks warehouse items as sold
   - Updates shop stock status to "sold"
   - Creates document in shops/{branch}/invoices/
   - Creates ledger entry
   - Shows invoice preview
5. User prints invoice
6. Bill cleared for next customer
```

**Code Location:** `Billing.tsx` → `handleSaveInvoice()` (lines 736-877)

---

### **Return Bill Flow**
```
1. User switches to "Return Bill" mode
2. User searches for original invoice (by ID or phone)
3. User selects invoice from results
4. User selects items to return
5. User provides return reason for each item
6. User selects settlement mode (exchange/refund)
7. User clicks "Process Return"
8. System:
   - Creates document in shops/{branch}/salesReturns/
   - Updates original invoice with return tracking
   - Updates stock status to "in-branch"
   - If exchange: sets credit and switches to new bill mode
   - If refund: completes and resets
```

**Code Location:** `Billing.tsx` → `processReturnBill()` (lines 529-655)

---

## 🔗 Linking Between Sales & Returns

### **When Return is Processed:**

1. **Return Bill Created:**
   ```typescript
   // Saved to: shops/{branch}/salesReturns/{autoId}
   {
     returnId: "RET-MIR-1234567890",
     originalInvoiceId: "INV-Miraj-1234567890",
     // ... return details
   }
   ```

2. **Original Invoice Updated:**
   ```typescript
   // Updated in: shops/{branch}/invoices/{invoiceId}
   {
     // ... existing invoice data
     hasReturns: true,
     returnIds: ["RET-MIR-1234567890"],
     returnedItemBarcodes: ["BC001", "BC002"]
   }
   ```

3. **Stock Updated:**
   ```typescript
   // Updated in: shops/{branch}/stockItems/{stockId}
   {
     status: "in-branch",  // Changed from "sold"
     returnedAt: "2026-01-24T12:30:00Z",
     updatedAt: "2026-01-24T12:30:00Z"
   }
   ```

---

## 🎯 Exchange Bill Flow (Return → New Sale)

### **Step 1: Process Return**
```typescript
// Creates return bill in salesReturns collection
settlementType: "exchange"
status: "pending"
totalCreditAmount: 5000  // 50% of returned items
```

### **Step 2: Credit Available**
```typescript
// System sets:
availableCredit = 5000
customerName = "John Doe"
customerPhone = "9876543210"
billMode = "new-bill"  // Switches to fresh bill mode
```

### **Step 3: Create New Sale**
```typescript
// User adds new items, then saves
// Creates NEW invoice in invoices collection:
{
  invoiceId: "INV-Miraj-9876543210",  // NEW invoice ID
  isExchangeBill: true,
  exchangeCredit: 5000,
  totals: {
    grandTotal: 8000,
    creditAdjustment: 5000,
    finalAmount: 3000  // Customer pays only 3000
  }
}
```

**Key Points:**
- ✅ Return bill and new sale are **separate documents**
- ✅ Return bill stays in `salesReturns` collection
- ✅ New sale goes to `invoices` collection
- ✅ Link maintained via `originalInvoiceId` and `exchangeInvoiceId`

---

## 📋 Reporting & Queries

### **Get All Fresh Sales**
```typescript
collection(db, "shops", branch, "invoices")
// Returns only sales invoices
```

### **Get All Returns**
```typescript
collection(db, "shops", branch, "salesReturns")
// Returns only return bills
```

### **Get Returns for Specific Invoice**
```typescript
query(
  collection(db, "shops", branch, "salesReturns"),
  where("originalInvoiceId", "==", invoiceId)
)
```

### **Get Exchange Bills Only**
```typescript
query(
  collection(db, "shops", branch, "invoices"),
  where("isExchangeBill", "==", true)
)
```

---

## ✅ Validation & Safety

### **Preventing Undefined Values**
```typescript
// ❌ WRONG - causes Firestore error
exchangeCredit: availableCredit > 0 ? availableCredit : undefined

// ✅ CORRECT - conditionally includes field
...(availableCredit > 0 && { exchangeCredit: availableCredit })
```

### **Return Eligibility Check**
```typescript
// Prevents returning same item twice
const returnedBarcodes = invoice.returnedItemBarcodes || [];
if (returnedBarcodes.includes(barcode)) {
  return { canReturn: false, reason: "Item already returned" };
}
```

---

## 🎨 Summary

| Aspect | Fresh Sales | Sales Returns |
|--------|-------------|---------------|
| **Collection** | `invoices` | `salesReturns` |
| **ID Format** | `INV-{branch}-{timestamp}` | `RET-{branch}-{timestamp}` |
| **Purpose** | Record new sales | Record returns & refunds |
| **Stock Impact** | Marks items as "sold" | Marks items as "in-branch" |
| **Ledger Entry** | Creates sale entry | Creates return entry |
| **Exchange Link** | `isExchangeBill: true` | `settlementType: "exchange"` |
| **Status** | N/A (completed on save) | `completed` / `pending` / `cancelled` |

---

## 🔧 Implementation Files

1. **Billing Page:** `src/pages/Shops/Billing.tsx`
   - Fresh sales: `handleSaveInvoice()` (line 736)
   - Returns: `processReturnBill()` (line 529)

2. **Return Bill Service:** `src/firebase/salesReturnBill.ts`
   - `createSalesReturnBill()` - Creates return record
   - `updateInvoiceWithReturn()` - Links return to invoice
   - `updateStockAfterReturn()` - Updates stock status

3. **Types:** Defined in `salesReturnBill.ts`
   - `SalesReturnBill` interface
   - `ReturnedItem` interface
   - `StoreCredit` interface

---

## ✨ Conclusion

The system **properly separates** fresh sales and returns:
- ✅ Different Firestore collections
- ✅ Different document structures
- ✅ Different workflows
- ✅ Proper linking via IDs
- ✅ No undefined values in Firestore
- ✅ Clean reporting capabilities
