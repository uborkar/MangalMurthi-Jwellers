# 🏷️ Jewellery Tag Printing - Quick Guide

## 📋 Complete Workflow

### 1️⃣ Generate Tags
```
Batch Tagging Page → Fill Details → Generate Batch
```

**Required Fields**:
- ✅ Category (Ring, Necklace, etc.)
- ✅ Location (Warehouse location)
- ✅ Quantity (Number of tags)
- ✅ Design (e.g., FLORAL, CLASSIC)
- ✅ Type (Cost Price Type, e.g., CP-A)
- ✅ Remark (Item name for customer)

**Result**: Grid of items with unique serial numbers and barcodes

---

### 2️⃣ Save to Database
```
Review Items → Click "Save All" → Wait for confirmation
```

**What Happens**:
- Items saved to Firestore with "tagged" status
- Serial numbers reserved (no duplicates)
- Items turn GREEN in the grid
- Ready for printing

---

### 3️⃣ Print Labels
```
Select Items → Click "Print Selected" → Print Dialog Opens
```

**Steps**:
1. Check boxes next to items you want to print
2. Click "Print Selected" button
3. New window opens with print preview
4. Print dialog appears automatically (500ms delay)
5. Review and click "Print"

**Important**: 
- ⚠️ Only saved items can be printed
- 💡 Allow pop-ups in your browser
- 🖨️ Use A4 paper with 8mm margins

---

### 4️⃣ Automatic Status Update
```
Print Complete → Window Updates Status → Items Marked "Printed"
```

**What Happens**:
- After print dialog closes, status updates automatically
- Items marked as "printed" in database
- Items turn PURPLE in the grid
- Confirmation message appears

---

## 🔄 Resume Interrupted Printing

### If You Need to Print Later
```
Click "Load Uncommitted Items" → Items Load → Select & Print
```

**Use Cases**:
- Printer was offline
- Ran out of paper
- Need to print in batches
- Browser crashed during printing

**How It Works**:
- Loads all items with "tagged" status (saved but not printed)
- Pre-fills form fields from loaded items
- Continue from Step 3 (Print Labels)

---

## 🎨 Tag Layout

### Unfolded Tag (50mm × 12mm)
```
┌─────────────┬───┬──────────────┐
│   LEFT      │ F │    RIGHT     │
│  (Internal) │ O │  (Customer)  │
│             │ L │              │
│  Type: CP-A │ D │  Item Name   │
│  Design: XX │   │  Barcode #   │
│  Loc: WH-A  │   │  [Barcode]   │
└─────────────┴───┴──────────────┘
   22mm       1.5mm    26.5mm
```

### After Folding
```
Customer sees:        Internal (hidden):
┌──────────────┐     ┌─────────────┐
│  Item Name   │     │  Type: CP-A │
│  Barcode #   │     │  Design: XX │
│  [Barcode]   │     │  Loc: WH-A  │
└──────────────┘     └─────────────┘
```

---

## 🎯 Status Indicators

### In Grid View
| Color | Badge | Status | Meaning |
|-------|-------|--------|---------|
| 🟡 Yellow | ⚠ Not Saved | New | Just generated, not saved yet |
| 🟢 Green | ✓ Saved | Tagged | Saved to database, ready to print |
| 🟣 Purple | ✓ Printed | Printed | Labels printed, ready for stocking |

### In Database
| Status | Description | Next Step |
|--------|-------------|-----------|
| `tagged` | Saved but not printed | Print labels |
| `printed` | Labels printed | Stock in warehouse |
| `stocked` | In warehouse inventory | Distribute to shops |
| `distributed` | Sent to shop | Available for sale |
| `sold` | Sold to customer | Complete |

---

## ⚙️ Printer Settings

### Recommended Settings
```
Paper Size:     A4 (210mm × 297mm)
Orientation:    Portrait
Margins:        8mm (all sides)
Scale:          100%
Color:          Black & White
Quality:        High/Best
Background:     Enabled (for borders)
```

### Browser Print Settings
```
✅ Background graphics: ON
✅ Headers/Footers: OFF
✅ Margins: Default (8mm)
✅ Scale: 100%
```

---

## 🐛 Troubleshooting

### Print Window Doesn't Open
**Problem**: Pop-up blocked  
**Solution**: Allow pop-ups for this site in browser settings

### Barcodes Not Visible
**Problem**: Background graphics disabled  
**Solution**: Enable "Background graphics" in print settings

### Tags Split Across Pages
**Problem**: Page break in middle of tag  
**Solution**: Already fixed with `page-break-inside: avoid`

### Status Not Updating
**Problem**: `afterprint` event not firing  
**Solution**: Close print dialog (don't cancel), status updates automatically

### Can't Print Unsaved Items
**Problem**: Items not saved to database  
**Solution**: Click "Save All" button first, then print

### Barcode Won't Scan
**Problem**: Barcode too thin or blurry  
**Solution**: Already fixed with width 1.2 and high-quality print

---

## 💡 Pro Tips

### Batch Printing
1. Generate large batch (e.g., 50 items)
2. Save all at once
3. Print in smaller groups (10-20 at a time)
4. Use "Load Uncommitted Items" to continue

### Quality Control
1. Print one test tag first
2. Verify barcode scans correctly
3. Check all information is readable
4. Adjust printer settings if needed
5. Print full batch

### Workflow Optimization
1. Prepare batch details in advance
2. Generate multiple batches before printing
3. Print all batches together
4. Reduces context switching

### Serial Number Management
- Each category has its own counter
- Deleted items' serials are reused (gap filling)
- No duplicate serials within a category
- Format: `MG-{CATEGORY}-{YEAR}-{SERIAL}`

---

## 📊 Example Workflow

### Scenario: Print 20 Ring Tags

```
1. Generate Batch
   Category: Ring
   Location: WH-A
   Quantity: 20
   Design: FLORAL
   Type: CP-A
   Remark: Daily Wear Ring
   
   → Click "Generate Batch"
   → 20 items appear in grid (Yellow badges)

2. Save to Database
   → Click "Save All (20)"
   → Wait for success message
   → Items turn GREEN

3. Print Labels
   → Click "Select All"
   → Click "Print Selected (20)"
   → New window opens
   → Print dialog appears
   → Click "Print"

4. Verify
   → Print window shows "✓ Items marked as printed"
   → Close window
   → Return to tagging page
   → Items now PURPLE
   → Done! ✅
```

---

## 🔐 Data Safety

### Automatic Backups
- All items saved to Firestore
- Serial numbers reserved permanently
- No data loss on browser crash
- Can resume anytime with "Load Uncommitted Items"

### Serial Number Protection
- Category-wise counters prevent duplicates
- Gap filling reuses deleted serials
- Counter format: `MG-{CAT}-{YY}`
- Example: `MG-RNG-25` for Rings in 2025

---

## 📞 Support

### Common Questions

**Q: Can I print the same items again?**  
A: Yes, use "Load Uncommitted Items" if status is still "tagged"

**Q: What if I need to reprint damaged tags?**  
A: Currently not supported. Future enhancement planned.

**Q: Can I change details after saving?**  
A: No, items are immutable after saving. Generate new batch if needed.

**Q: How do I know which items are printed?**  
A: Check status badges (Purple = Printed) or view in "Tagged Items Management"

**Q: Can I print from multiple categories at once?**  
A: No, one category per batch. Generate separate batches for different categories.

---

## ✅ Quick Checklist

Before Printing:
- [ ] All required fields filled
- [ ] Batch generated successfully
- [ ] Items saved to database (GREEN badges)
- [ ] Items selected for printing
- [ ] Pop-ups allowed in browser
- [ ] Printer connected and ready
- [ ] A4 paper loaded
- [ ] Print settings configured

After Printing:
- [ ] Print quality verified
- [ ] Barcodes scan correctly
- [ ] Status updated to "printed" (PURPLE)
- [ ] Print window closed
- [ ] Tags ready for attachment

---

**Last Updated**: December 23, 2025  
**Version**: 2.0 (with auto-print and auto-status)
