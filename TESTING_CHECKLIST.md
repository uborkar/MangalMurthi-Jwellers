# ✅ Warehouse System Testing Checklist

## 🎯 Pre-Testing Setup

- [ ] Firebase connection working
- [ ] User authenticated
- [ ] Categories configured in Firebase

---

## 📋 Test Scenarios

### 1. **Tagging Page** (`/warehouse/tagging`)

#### Generate Tags
- [ ] Select category (e.g., Ring)
- [ ] Select location (e.g., Mumbai Malad)
- [ ] Set quantity (e.g., 10)
- [ ] Click "Generate Tags"
- [ ] Verify serials are sequential
- [ ] Verify barcodes format: `MG-RNG-MAL-25-000001`

#### Print Tags
- [ ] Select some items (checkboxes)
- [ ] Click "Print Selected"
- [ ] Verify print window opens
- [ ] Check barcode rendering

#### Save Tags
- [ ] Click "Save All"
- [ ] Verify success toast
- [ ] Check items marked as committed

#### View Tagged Items
- [ ] Click "View Tagged Items" button
- [ ] Verify table shows items
- [ ] Check serials, barcodes, status
- [ ] Verify latest items appear first

#### Migrate Old Data
- [ ] Click "Migrate Old Data"
- [ ] Confirm dialog
- [ ] Verify migration results
- [ ] Check items appear in table
- [ ] Verify counts are correct

---

### 2. **Dashboard** (`/`)

#### Warehouse Overview
- [ ] Check all 6 status cards display
- [ ] Verify counts match database
- [ ] Verify values are calculated
- [ ] Check color coding

#### Quick Actions
- [ ] Click "Tagging" → Goes to tagging page
- [ ] Click "Stock In" → Goes to stock-in page
- [ ] Click "Distribution" → Goes to distribution page
- [ ] Click "Reports" → Goes to reports page

---

### 3. **Stock-In Page** (`/warehouse/stock-in`)

#### Load Items
- [ ] Page loads items with status `printed` or `tagged`
- [ ] Items grouped by category
- [ ] Counts displayed correctly

#### Barcode Scanning
- [ ] Scan a barcode (or type manually)
- [ ] Item appears in "Scanned Items"
- [ ] Duplicate scan shows warning
- [ ] Invalid barcode shows error

#### Stock In
- [ ] Select items manually or via scan
- [ ] Click "Stock In Selected"
- [ ] Verify success message
- [ ] Check items removed from list
- [ ] Verify status changed to `stocked` in database

---

### 4. **Distribution Page** (`/warehouse/distribution`)

#### Load Inventory
- [ ] Page shows items with status `stocked`
- [ ] Filter by category works
- [ ] Search by barcode works

#### Distribute Items
- [ ] Select shop from dropdown
- [ ] Select items (checkboxes)
- [ ] Click "Distribute to Shop"
- [ ] Confirm dialog
- [ ] Verify success message
- [ ] Check items removed from list
- [ ] Verify status changed to `distributed`
- [ ] Verify shop name recorded

---

### 5. **Reports Page** (`/warehouse/reports`)

#### View Statistics
- [ ] Status counts display correctly
- [ ] Category breakdown shows
- [ ] Total values calculated
- [ ] Charts/graphs render

#### Export to Excel
- [ ] Click "Export to Excel"
- [ ] File downloads
- [ ] Open Excel file
- [ ] Verify all columns present
- [ ] Check data accuracy

---

## 🔄 End-to-End Workflow Test

### Complete Item Journey

1. **Tagging**
   - [ ] Generate 5 Ring items
   - [ ] Save to database
   - [ ] Note serial numbers

2. **Dashboard Check**
   - [ ] Go to dashboard
   - [ ] Verify "Tagged" count increased by 5

3. **Stock-In**
   - [ ] Go to Stock-In page
   - [ ] Scan/select the 5 items
   - [ ] Stock them in
   - [ ] Verify status changed

4. **Dashboard Check**
   - [ ] Go to dashboard
   - [ ] Verify "Tagged" decreased by 5
   - [ ] Verify "In Stock" increased by 5

5. **Distribution**
   - [ ] Go to Distribution page
   - [ ] Select shop (e.g., Sangli Branch)
   - [ ] Select the 5 items
   - [ ] Distribute them
   - [ ] Verify status changed

6. **Dashboard Check**
   - [ ] Go to dashboard
   - [ ] Verify "In Stock" decreased by 5
   - [ ] Verify "Distributed" increased by 5

7. **Reports**
   - [ ] Go to Reports page
   - [ ] Verify all counts match
   - [ ] Export to Excel
   - [ ] Verify the 5 items in export

---

## 🧪 Edge Cases

### Serial Number Testing
- [ ] Generate items in Category A
- [ ] Generate items in Category B
- [ ] Verify serials are independent
- [ ] Generate more items in Category A
- [ ] Verify serials continue from last

### Data Migration
- [ ] Create items in old collections (if any)
- [ ] Run migration
- [ ] Verify all items migrated
- [ ] Check no duplicates
- [ ] Verify status mapping correct

### Clear All Data (DANGER!)
- [ ] Click "Clear All Data"
- [ ] Type wrong confirmation → Cancelled
- [ ] Type "DELETE ALL" → Confirmed
- [ ] Verify all items deleted
- [ ] Verify counters reset
- [ ] Generate new items → Starts from serial 1

---

## 🐛 Error Handling

### Network Errors
- [ ] Disconnect internet
- [ ] Try to load items → Shows error
- [ ] Try to save items → Shows error
- [ ] Reconnect → Retry works

### Invalid Data
- [ ] Try to generate 0 items → Shows error
- [ ] Try to generate 1001 items → Shows error
- [ ] Try to save without category → Shows error

### Duplicate Barcodes
- [ ] System should prevent duplicates
- [ ] Atomic counter ensures uniqueness

---

## 📊 Performance Testing

### Large Datasets
- [ ] Generate 100 items → Fast
- [ ] Generate 500 items → Acceptable
- [ ] View 1000+ items → Pagination works
- [ ] Export 1000+ items → Excel works

### Concurrent Users
- [ ] Two users generate tags simultaneously
- [ ] Verify no serial conflicts
- [ ] Check atomic counter works

---

## ✅ Final Verification

### Database Check
- [ ] Open Firebase Console
- [ ] Check `warehouseItems` collection
- [ ] Verify item structure correct
- [ ] Check `counters` collection
- [ ] Verify counter values

### UI/UX Check
- [ ] All pages load without errors
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Toasts appear correctly
- [ ] Loading states show

### Documentation
- [ ] README is accurate
- [ ] Code comments present
- [ ] API functions documented

---

## 🎉 Sign-Off

**Tested By**: _______________
**Date**: _______________
**Version**: 2.0
**Status**: ⬜ Pass | ⬜ Fail

**Notes**:
```
[Add any issues or observations here]
```

---

**All tests passed? You're ready for production! 🚀**
