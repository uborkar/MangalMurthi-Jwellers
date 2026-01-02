# 🧪 Testing Guide - Module by Module

## 📋 Pre-Testing Setup

1. **Firebase Connection**
   - Verify Firebase config in `src/firebase/config.ts`
   - Check Firestore rules are set correctly
   - Ensure authentication is working

2. **Test Data**
   - Have some sample items ready
   - Prepare test barcodes
   - Create test branches if needed

---

## 🔍 Module 1: Tagging & Labels

### Test Cases:

#### TC1.1: Create Single Tag
1. Go to `/warehouse/tagging`
2. Fill in item details:
   - Category: "Ring"
   - Subcategory: "Gold Ring"
   - Location: "Shelf A"
   - Weight: "5.5"
   - Purity: "22K"
   - Price: "25000"
3. Click "Generate Barcode"
4. **Expected:** Serial number generated (e.g., RING-001)
5. **Expected:** Barcode displayed
6. Click "Save to Database"
7. **Expected:** Success message
8. **Expected:** Item appears in table below

#### TC1.2: Print Labels
1. Select 1-3 items from table
2. Click "Print Selected Labels"
3. **Expected:** Print preview opens
4. **Expected:** 4x2 label format displayed
5. **Expected:** Barcode, serial, category, weight visible

#### TC1.3: Batch Operations
1. Create 5-10 items
2. Select all
3. Click "Print Selected Labels"
4. **Expected:** All labels print correctly

#### TC1.4: Gap Filling
1. Note the last serial number (e.g., RING-005)
2. Delete RING-003
3. Create new ring
4. **Expected:** New item gets RING-003 (fills the gap)

---

## 📦 Module 2: Stock In

### Test Cases:

#### TC2.1: Barcode Scan Stock-In
1. Go to `/warehouse/stock-in`
2. Use barcode scanner or type barcode
3. **Expected:** Item details auto-populate
4. Click "Add to Stock"
5. **Expected:** Item status changes to "stocked"
6. **Expected:** Item appears in stocked items table

#### TC2.2: Excel Import
1. Download sample Excel template
2. Fill with 5-10 items
3. Upload file
4. **Expected:** All items imported
5. **Expected:** Success count displayed
6. **Expected:** Items visible in table

#### TC2.3: Duplicate Prevention
1. Try to stock-in same barcode twice
2. **Expected:** Error message
3. **Expected:** Item not duplicated

---

## 🚚 Module 3: Distribution

### Test Cases:

#### TC3.1: Distribute to Branch
1. Go to `/warehouse/distribution`
2. Select branch: "Sangli"
3. Scan/select 3-5 items
4. Click "Distribute"
5. **Expected:** Confirmation dialog
6. Confirm
7. **Expected:** Success message
8. **Expected:** Items status = "distributed"
9. Go to `/shops/branch-stock`
10. Select "Sangli"
11. **Expected:** Items appear in branch stock

#### TC3.2: Distribution Challan
1. After distribution
2. **Expected:** Challan window opens
3. **Expected:** All items listed
4. **Expected:** Totals calculated
5. Print challan

---

## 📊 Module 4: Warehouse Reports

### Test Cases:

#### TC4.1: Generate Report
1. Go to `/warehouse/reports`
2. Select filters (status, category, date range)
3. Click "Generate Report"
4. **Expected:** Report displayed
5. **Expected:** Summary section shows totals
6. **Expected:** Category-wise breakdown visible

#### TC4.2: Excel Export
1. Click "Export to Excel"
2. **Expected:** Excel file downloads
3. Open file
4. **Expected:** Multiple sheets (Summary, Details, Category-wise)
5. **Expected:** Professional formatting
6. **Expected:** Totals match screen

---

## 🏪 Module 5: Branch Stock

### Test Cases:

#### TC5.1: View Branch Stock
1. Go to `/shops/branch-stock`
2. Select branch
3. **Expected:** All distributed items shown
4. **Expected:** Category-wise serial numbers restart at 1

#### TC5.2: Export Branch Stock
1. Click "Export to Excel"
2. **Expected:** Excel downloads
3. **Expected:** Serial numbers restart per category
4. **Expected:** Totals calculated

---

## 💰 Module 6: POS Billing

### Test Cases:

#### TC6.1: Create Invoice
1. Go to `/shops/billing`
2. Select branch
3. Scan barcode
4. **Expected:** Item added to bill
5. **Expected:** Price auto-filled
6. Edit selling price if needed
7. Add 2-3 more items
8. Enter customer details
9. Click "Generate Invoice"
10. **Expected:** Invoice created
11. **Expected:** Items status = "sold"
12. **Expected:** Invoice number generated

#### TC6.2: GST Calculation
1. Add items to bill
2. **Expected:** CGST calculated (GST/2)
3. **Expected:** SGST calculated (GST/2)
4. **Expected:** Grand total = Taxable + GST

#### TC6.3: Print Invoice
1. After generating invoice
2. Click "Print"
3. **Expected:** Print preview opens
4. **Expected:** All details visible
5. **Expected:** GST breakdown shown

---

## 📝 Module 7: Sale Booking

### Test Cases:

#### TC7.1: Create Booking
1. Go to `/shops/sale-booking`
2. Scan barcode
3. **Expected:** Item details auto-fill
4. Add stone/sapphire details
5. Enter transfer number
6. Add 2-3 items
7. Enter payment details
8. **Expected:** Net amount calculated
9. **Expected:** Pending amount = Net - Cash Advance
10. Save booking

---

## 🔄 Module 8: Sales Return

### Test Cases:

#### TC8.1: Customer Return
1. Go to `/shops/sales-return`
2. Select "Customer Return"
3. Enter invoice ID
4. **Expected:** Invoice found
5. **Expected:** Items listed
6. Select items to return
7. Enter return reason
8. Process return
9. **Expected:** Items status = "in-branch"
10. Go to branch stock
11. **Expected:** Items back in stock

#### TC8.2: Warehouse Return
1. Select "Shop to Warehouse"
2. Enter invoice ID
3. Select items
4. Enter reason: "Unsold Stock"
5. Process return
6. **Expected:** Items status = "returned"
7. **Expected:** Items removed from branch
8. Go to warehouse
9. **Expected:** Items back in warehouse

---

## 💸 Module 9: Shop Expenses

### Test Cases:

#### TC9.1: Add Daily Expense
1. Go to `/shops/shop-expense`
2. Select branch and date
3. Add expense entry
4. Select category
5. Enter amount and description
6. Add 3-5 entries
7. Save
8. **Expected:** Total calculated
9. **Expected:** Saved to database

---

## 🚛 Module 10: Shop Transfer

### Test Cases:

#### TC10.1: Transfer Between Shops
1. Go to `/shops/shop-transfer`
2. Select From: "Sangli"
3. Select To: "Miraj"
4. Add 3-5 items
5. Enter transport details
6. Click "Save & Challan"
7. **Expected:** Confirmation dialog
8. Confirm
9. **Expected:** Items removed from Sangli
10. **Expected:** Items added to Miraj
11. **Expected:** Challan opens
12. Print challan

---

## 📈 Module 11: Reports Testing

### TC11.1: Sales Report
1. Go to `/shops/sales-report`
2. Select date range
3. **Expected:** Metrics displayed
4. **Expected:** Category-wise sales
5. **Expected:** Salesperson performance
6. Export to Excel
7. **Expected:** Comprehensive report

### TC11.2: Expense Report
1. Go to `/shops/shop-expense-report`
2. Select filters
3. **Expected:** Category summary
4. **Expected:** Branch summary
5. Export to Excel

### TC11.3: Transfer Report
1. Go to `/shops/shop-transfer-report`
2. Select filters
3. **Expected:** Transfer history
4. **Expected:** From/To summaries
5. View transfer details
6. Export to Excel

### TC11.4: CA Report ⭐
1. Go to `/shops/ca-report`
2. Select date range and branch
3. **Expected:** Sales summary
4. **Expected:** Purchase summary
5. **Expected:** Profit/Loss calculated
6. **Expected:** Category-wise breakdown
7. Export to Excel
8. **Expected:** Professional CA report format

---

## 🔍 Integration Testing

### IT1: Complete Item Journey
1. Create tag → Stock-in → Distribute → Bill → Customer Return
2. **Expected:** Status updates at each step
3. **Expected:** Item traceable throughout

### IT2: Multi-Branch Operations
1. Distribute to 3 branches
2. Create sales in each
3. Transfer between branches
4. **Expected:** All inventories accurate

### IT3: Report Accuracy
1. Perform 10-15 transactions
2. Generate all reports
3. **Expected:** Numbers match across reports
4. **Expected:** Totals accurate

---

## ⚠️ Error Handling Testing

### EH1: Invalid Inputs
- Try empty fields
- Try negative numbers
- Try duplicate barcodes
- **Expected:** Proper error messages

### EH2: Network Issues
- Disconnect internet
- Try operations
- **Expected:** Graceful error handling

### EH3: Permission Issues
- Test with different user roles
- **Expected:** Proper access control

---

## ✅ Success Criteria

- [ ] All modules load without errors
- [ ] All CRUD operations work
- [ ] Reports generate correctly
- [ ] Excel exports work
- [ ] Barcodes scan properly
- [ ] Status updates correctly
- [ ] Inventory stays accurate
- [ ] No data loss
- [ ] Performance acceptable
- [ ] UI responsive

---

## 📝 Bug Reporting Template

```
**Module:** [Module Name]
**Test Case:** [TC Number]
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach if applicable]

**Priority:** High / Medium / Low
```

---

**Testing Order:**
1. Warehouse modules (1-4)
2. Shop modules (5-10)
3. Reports (11)
4. Integration tests
5. Error handling

**Estimated Time:** 4-6 hours for complete testing

Good luck! 🚀
