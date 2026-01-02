# 📦 Complete Warehouse Workflow Guide

## 🎯 Overview

This guide explains the complete end-to-end workflow for managing jewellery items from tagging to distribution.

---

## 🔄 Complete Workflow

```
1. TAGGING → 2. STOCK-IN → 3. DISTRIBUTION → 4. SHOP OPERATIONS
   (tagged)     (stocked)      (distributed)      (sold/returned)
```

---

## 📋 Step-by-Step Process

### **Step 1: Tagging Page** (`/warehouse/tagging`)

**Purpose**: Create and tag new items with barcodes

**Process**:
1. **Select Category** (e.g., Necklace, Ring)
2. **Select Location** (Mumbai Malad, Pune, Sangli)
3. **Set Quantity** (1-1000 items)
4. **Fill Details**:
   - Design/Pattern (e.g., modern, traditional)
   - Cost Price Type (CP-A, CP-B, etc.)
   - Remark (item name/description)
5. **Click "Generate Tags"**
   - System reserves serial numbers
   - Barcodes generated (e.g., MG-NCK-MAL-25-000001)
   - Items appear in grid

6. **Optional: Print Labels**
   - Select items to print
   - Click "Print Selected"
   - Print window opens with barcode labels
   - Labels show only barcode image with text below

7. **Click "Save All"**
   - Items saved to database
   - Status: `tagged`
   - Ready for stock-in

**Result**: Items created with status `tagged`

---

### **Step 2: Stock-In Page** (`/warehouse/stock-in`)

**Purpose**: Receive tagged items into warehouse stock

**What You See**:
- All items with status `tagged` or `printed`
- Grouped by category (Necklace, Ring, etc.)
- Sorted by serial number (1, 2, 3...)
- Status badge showing current state

**Process**:

#### **Option A: Barcode Scanner** (Recommended)
1. Use barcode scanner or type barcode manually
2. Scan each item
3. Item automatically added to selection
4. Click "Stock In Selected"

#### **Option B: Manual Selection**
1. Browse items by category
2. Check boxes to select items
3. Use "Select All" for bulk selection
4. Click "Stock In (X)" button

**What Happens**:
- Items status changes: `tagged` → `stocked`
- Items removed from Stock-In page
- Items now available in Distribution page
- Timestamp recorded

**Result**: Items moved to warehouse stock with status `stocked`

---

### **Step 3: Distribution Page** (`/warehouse/distribution`)

**Purpose**: Send stocked items to shops/branches

**What You See**:
- All items with status `stocked`
- Serial numbers in order
- Category, weight, price details
- Filter and search options

**Process**:
1. **Select Shop** from dropdown
   - Sangli Branch
   - Miraj Branch
   - Kolhapur Branch
   - Mumbai Malad
   - Pune Branch

2. **Filter Items** (optional)
   - By category
   - By search text

3. **Select Items**
   - Check boxes for items to distribute
   - Use "Select All" for bulk
   - Review selected count and total value

4. **Click "Distribute to Shop"**
   - Confirmation dialog appears
   - Shows: Shop name, item count, total value
   - Click "Confirm Transfer"

**What Happens**:
- Items status changes: `stocked` → `distributed`
- Items removed from Distribution page
- Items added to shop's stock
- Shop name and timestamp recorded
- Items now in shop system

**Result**: Items sent to shop with status `distributed`

---

## 📊 Data Flow

### Database Collections

#### 1. `warehouseItems` (Main Collection)
```javascript
{
  id: "abc123",
  barcode: "MG-NCK-MAL-25-000001",
  serial: 1,
  category: "Necklace",
  subcategory: "modern",
  location: "Mumbai Malad",
  status: "tagged", // → "stocked" → "distributed"
  taggedAt: "2024-12-20T10:00:00Z",
  stockedAt: "2024-12-20T11:00:00Z",
  distributedAt: "2024-12-20T12:00:00Z",
  distributedTo: "Sangli Branch",
  // ... other fields
}
```

#### 2. `counters` (Serial Tracking)
```javascript
{
  id: "MG-NCK-25",
  lastSerial: 10,
  updatedAt: "2024-12-20T10:00:00Z"
}
```

#### 3. `shops/{shopName}/stockItems` (Shop Stock)
```javascript
{
  barcode: "MG-NCK-MAL-25-000001",
  category: "Necklace",
  status: "in-branch",
  warehouseItemId: "abc123",
  transferredAt: "2024-12-20T12:00:00Z",
  // ... other fields
}
```

---

## 🎨 UI Features

### **Stock-In Page Improvements**

✅ **Status Column** (instead of "Printed At")
- Shows current status badge
- Color-coded: `tagged` (gray), `printed` (blue)

✅ **Serial Number Sorting**
- Items sorted by serial within each category
- Easy to find specific items
- Sequential order (1, 2, 3...)

✅ **Category Grouping**
- Items grouped by category
- Expand/collapse panels
- Category stats (total, selected)

✅ **Dashboard Stats**
- Ready Items (tagged + printed)
- Filtered count
- Selected count
- Total tagged, stocked, distributed

### **Distribution Page Improvements**

✅ **Serial Column Added**
- Shows serial number for each item
- Sorted by serial number

✅ **Better Barcode Display**
- Styled barcode badges
- Easy to read and scan

✅ **Shop Selection**
- Dropdown with all shops
- Clear shop names

---

## 🔍 Your Current Situation

### What You Have:
- ✅ 20 items tagged (10 Necklace + 10 Ring)
- ✅ Items saved in database
- ✅ Status: `tagged`
- ✅ Categorized properly
- ✅ Serial numbers assigned

### What To Do Next:

#### **Option 1: Stock-In Without Printing** (Faster)
1. Go to Stock-In page
2. You'll see all 20 items
3. Select all items (or by category)
4. Click "Stock In"
5. Items now in warehouse stock

#### **Option 2: Print Then Stock-In** (Recommended)
1. Go back to Tagging page
2. Click "View Tagged Items"
3. See your 20 items
4. Generate new batch or work with existing
5. Select items and print labels
6. Go to Stock-In page
7. Scan or select items
8. Click "Stock In"

---

## 📈 Best Practices

### 1. **Serial Number Management**
- Each category has independent serials
- Necklace: 1, 2, 3... 10
- Ring: 1, 2, 3... 10
- System handles this automatically

### 2. **Workflow Order**
Always follow the sequence:
```
Tagging → Stock-In → Distribution → Shop
```
Don't skip steps!

### 3. **Barcode Scanning**
- Use barcode scanner for speed
- Reduces manual errors
- Faster stock-in process

### 4. **Category Organization**
- Items grouped by category
- Easy to find and manage
- Better inventory control

### 5. **Status Tracking**
- Always check item status
- Use filters to find items
- Monitor workflow progress

---

## 🐛 Troubleshooting

### Issue: Items not showing in Stock-In
**Solution**: Check if items have status `tagged` or `printed`

### Issue: Can't distribute items
**Solution**: Items must be `stocked` first. Go to Stock-In page.

### Issue: Serial numbers seem wrong
**Solution**: Each category has independent serials. This is correct!

### Issue: "Printed At" shows "-"
**Solution**: This is normal for tagged items. Status column shows current state.

---

## ✅ Quick Checklist

### For Your 20 Items:

- [x] Items tagged and saved
- [ ] Items stocked-in
- [ ] Items distributed to shop
- [ ] Items in shop system

### Next Steps:

1. **Go to Stock-In page** (`/warehouse/stock-in`)
2. **Verify 20 items appear** (10 Necklace + 10 Ring)
3. **Check they're sorted by serial** (1-10 for each category)
4. **Select all items** (or by category)
5. **Click "Stock In (20)"**
6. **Verify success message**
7. **Go to Distribution page** (`/warehouse/distribution`)
8. **Verify 20 items now appear there**
9. **Select shop** (e.g., Sangli Branch)
10. **Select items to distribute**
11. **Click "Distribute to Shop"**
12. **Confirm transfer**
13. **Done!** Items now in shop system

---

## 📞 Summary

### What Was Fixed:

1. ✅ **Stock-In Page**
   - Changed "Printed At" to "Status" column
   - Added status badges (tagged/printed)
   - Added serial number sorting
   - Shows "Tagged At" date instead

2. ✅ **Distribution Page**
   - Added Serial column
   - Sorted items by serial number
   - Better barcode display
   - Improved table layout

3. ✅ **Workflow Clarity**
   - Clear status progression
   - Easy to track items
   - Proper categorization
   - Serial number ordering

### Your Workflow Now:

```
1. Tagging Page
   ↓ (Save items)
   Status: tagged
   
2. Stock-In Page
   ↓ (Stock in items)
   Status: stocked
   
3. Distribution Page
   ↓ (Distribute to shop)
   Status: distributed
   
4. Shop System
   Status: in-branch
```

**Everything is ready! Follow the steps above to complete your workflow.** 🚀

---

**Need Help?**
- Check item status in each page
- Use filters to find items
- Follow the workflow sequence
- Monitor dashboard stats

**Happy Managing! 📦✨**
