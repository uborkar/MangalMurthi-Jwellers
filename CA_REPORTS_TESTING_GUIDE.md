# 🧪 CA Reports Testing Guide

## ✅ Pre-requisites
1. Dev server running: `npm run dev`
2. Logged into the application
3. Have some data in:
   - Warehouse inventory (for purchase reports)
   - Shop sales (for sales reports)

---

## 📝 Testing Steps

### **1. Access CA Reports Dashboard**
```
Navigation: Sidebar → CA Reports → CA Dashboard
URL: http://localhost:5173/ca/dashboard
```

**Expected Result:**
- ✅ Dashboard loads with 4 report cards
- ✅ Purchase Reports section (blue)
- ✅ Sales Reports section (green)
- ✅ Quick stats showing report counts

---

### **2. Test Purchase Annexure 1A (Purchase Register)**

**Steps:**
1. Click **"Purchase Annexure 1A"** card
2. Page should load with:
   - Date range filters (From/To)
   - View mode dropdown
   - Export Excel button
   - Print button (printer icon)
   - GST Summary cards (5 cards showing totals)
   - Data table

**Test Actions:**

#### A. Date Filter Test
- Set "From Date" to 1 month ago
- Set "To Date" to today
- Click outside or press Enter
- **Expected:** Data reloads, toast shows "Loaded X records"

#### B. View Mode Test
- Switch between:
  - Supplierwise
  - Productwise  
  - Detailed Register
- **Expected:** Table header changes accordingly

#### C. Data Verification
Check if table shows:
- ✅ Date column
- ✅ Supplier name
- ✅ Invoice number
- ✅ Item description (jewellery items)
- ✅ Taxable Value (₹)
- ✅ CGST Amount (₹)
- ✅ SGST Amount (₹)
- ✅ Total Amount (₹)

#### D. GST Summary Cards
Verify 5 cards show:
- ✅ Taxable Value (total)
- ✅ CGST (total)
- ✅ SGST (total)
- ✅ IGST (total)
- ✅ Total Value (total)

#### E. Export Excel Test
1. Click **"Export Excel"** button
2. **Expected:**
   - Loading toast appears
   - Excel file downloads
   - Success toast: "Excel report downloaded!"
3. Open Excel file and verify:
   - Sheet 1: GST Summary
   - Sheet 2: Purchase Register (detailed records)
   - Proper formatting with headers

#### F. Print Test
1. Click **Print** button (printer icon)
2. **Expected:**
   - Browser print dialog opens
   - Preview shows clean table (no filters/buttons)
   - Landscape orientation
3. Test print or save as PDF

---

### **3. Test Purchase Annexure 2A (Purchase Returns)**

**Steps:**
1. Go back to CA Dashboard
2. Click **"Purchase Annexure 2A"**
3. Repeat same tests as above

**Expected Data:**
- Purchase return records
- Return reasons
- Original invoice references
- Red-themed summary cards

---

### **4. Test Sales Annexure 1A (Sales Register)**

**Steps:**
1. Go back to CA Dashboard
2. Click **"Sales Annexure 1A"**

**Additional Test:**
- **Shop Filter:** Select specific shop (Sangli/Miraj/Kolhapur)
- **Expected:** Data filters to that shop only

**Data Verification:**
- ✅ Customer names
- ✅ Phone numbers
- ✅ Invoice numbers
- ✅ Jewellery items sold
- ✅ Weight in grams
- ✅ Making charges
- ✅ GST breakdown

---

### **5. Test Sales Annexure 2A (Sales Returns)**

**Steps:**
1. Go back to CA Dashboard
2. Click **"Sales Annexure 2A"**
3. Test with shop filter
4. Verify return data shows

---

## 🐛 Common Issues & Solutions

### Issue 1: "No records found"
**Cause:** No data in database for selected date range  
**Solution:** 
- Adjust date range to include data
- Check if you have warehouse inventory or sales data
- Try "All time" date range

### Issue 2: Excel export fails
**Cause:** Browser blocking download  
**Solution:** Allow popups/downloads for localhost

### Issue 3: Print shows filters
**Cause:** Print styles not applied  
**Solution:** Refresh page and try again

### Issue 4: GST amounts showing 0
**Cause:** Data doesn't have price/cost information  
**Solution:** Check if your inventory/sales have price fields

---

## ✅ Success Criteria

All tests pass if:
- ✅ All 4 reports load without errors
- ✅ Date filters work correctly
- ✅ Data displays in tables
- ✅ GST summary cards show totals
- ✅ Excel export downloads successfully
- ✅ Print preview shows clean layout
- ✅ Shop filter works (for sales reports)
- ✅ View mode switching works

---

## 📊 Sample Test Data

If you don't have data, the reports will show:
```
"No purchase records found for the selected period"
"No sales records found for the selected period"
```

This is normal! The reports are working correctly, you just need to:
1. Add items to warehouse inventory (Tagging page)
2. Make some sales (POS Billing page)
3. Then test the reports again

---

## 🎯 Quick Test Checklist

- [ ] CA Dashboard loads
- [ ] Purchase Annexure 1A opens
- [ ] Date filter works
- [ ] View mode switches
- [ ] GST cards show totals
- [ ] Data table displays
- [ ] Excel export works
- [ ] Print preview works
- [ ] Purchase Annexure 2A works
- [ ] Sales Annexure 1A works
- [ ] Shop filter works
- [ ] Sales Annexure 2A works

---

## 📞 Next Steps After Testing

1. **If all tests pass:** Reports are ready for production use!
2. **If data is missing:** Add sample transactions and retest
3. **If errors occur:** Check browser console for error messages
4. **For customization:** Request specific field changes or additional filters

---

## 💡 Tips

- Use **Chrome/Edge** for best compatibility
- Test with **real data** for accurate results
- **Print to PDF** to save reports permanently
- **Excel files** can be shared with your CA directly
- Reports are **GST-compliant** for Indian tax filing

---

**Ready to test? Start with Step 1!** 🚀
