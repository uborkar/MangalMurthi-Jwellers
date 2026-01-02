# 📋 How to Print Jewellery Tags - Quick Guide

## 🎯 Complete Workflow

### Step 1: Create Tags in Tagging Page
1. Go to **Warehouse → Tagging & Labels**
2. Fill in batch details:
   ```
   Category:  Ring
   Location:  TRAY-A1
   Quantity:  10
   Design:    FLORAL
   Type:      GOLD-CP
   Remark:    Daily Wear Ring
   Price:     5000
   ```
3. Click **"Generate Batch"**
4. Review generated items with barcodes

### Step 2: Select Items to Print
1. Check the boxes next to items you want to print
2. Or click **"Select All"** to print entire batch
3. Click **"Print Selected (X)"** button

### Step 3: Preview Tags
A new window opens showing:
```
┌─────────────────────────────────────────────────────┐
│ LEFT SIDE          │ FOLD │ RIGHT SIDE              │
│ Type: GOLD-CP      │  ┊   │   Daily Wear Ring       │
│ Design: FLORAL     │  ┊   │ ▐▐▌▐▌▐▐▌▐▌▐▐▌▐▌▐▐      │
│ Loc: TRAY-A1       │  ┊   │ MG-RNG-LOC-25-00001     │
└─────────────────────────────────────────────────────┘
```

**Screen Preview Features:**
- ✅ 2-column layout for easy viewing
- ✅ Visual "FOLD" indicator in middle
- ✅ All information visible
- ✅ Info box at bottom with tips

### Step 4: Print
1. Click **"Print Labels"** button (or Ctrl+P / Cmd+P)
2. Printer dialog opens
3. **Important Settings:**
   - Paper: A4 (210mm × 297mm)
   - Scale: 100% (no fit-to-page)
   - Quality: Best/High Quality
   - Color: Black & White is fine
4. Click **Print**

### Step 5: Physical Process
1. **Cut**: Cut along tag borders
2. **Fold**: Fold at middle dashed line
3. **Attach**: Thread through middle gap
4. **Verify**: Scan barcode to test

---

## 📐 Tag Dimensions Reference

### Unfolded (as printed)
```
60mm total width × 12mm height
├─ 30mm: Back (Type, Design, Location)
├─  3mm: Gap (Fold/Tie area)
└─ 27mm: Front (Item Name + Barcode)
```

### Folded (after cutting)
```
30mm width × 12mm height (each side)
Front shows: Item Name + Barcode
Back shows: Type, Design, Location
```

---

## 🖨️ Print Layout on A4

```
┌─────────────────────────────────────────┐
│  [Tag 1]    [Tag 2]    [Tag 3]          │
│  [Tag 4]    [Tag 5]    [Tag 6]          │
│  [Tag 7]    [Tag 8]    [Tag 9]          │
│  [Tag 10]   [Tag 11]   [Tag 12]         │
│  [Tag 13]   [Tag 14]   [Tag 15]         │
│  [Tag 16]   [Tag 17]   [Tag 18]         │
│  [Tag 19]   [Tag 20]   [Tag 21]         │
└─────────────────────────────────────────┘

3 columns × 7 rows = 21 tags per A4 sheet
```

---

## ✅ What Each Side Shows

### LEFT SIDE (Back) - Internal Use
```
Type: GOLD-CP
Design: FLORAL
Loc: TRAY-A1
```
**Purpose:**
- Staff reference
- Quick identification without scanning
- Inventory management
- Physical location tracking

### RIGHT SIDE (Front) - Customer Facing
```
Daily Wear Ring
▐▐▌▐▌▐▐▌▐▌▐▐▌▐▌▐▐
MG-RNG-LOC-25-00001
```
**Purpose:**
- Customer sees item name
- Barcode for scanning
- Clean, professional look
- Easy to read

---

## 🔍 Barcode Format Explained

Example: `MG-RNG-LOC-25-00001`

```
MG     = MangalMurti (Company Code)
RNG    = Ring (Category Code)
LOC    = Location Code
25     = Year (2025)
00001  = Serial Number
```

**Category Codes:**
- RNG = Ring
- NCK = Necklace
- BRC = Bracelet
- ERG = Earring
- BGL = Bangle
- PDT = Pendant

---

## 💡 Pro Tips

### Before Printing
1. ✅ Verify all information is correct
2. ✅ Check barcode generates properly
3. ✅ Print 1 test tag first
4. ✅ Measure printed tag (should be 60mm × 12mm)

### During Printing
1. ✅ Use laser printer for durability
2. ✅ Print at 100% scale (critical!)
3. ✅ Use high-quality setting
4. ✅ Check paper alignment

### After Printing
1. ✅ Cut carefully along borders
2. ✅ Fold at dashed line
3. ✅ Test barcode scanning
4. ✅ Attach securely to jewellery

---

## 🎨 Tag Paper Options

### Option 1: Pre-cut Tag Paper
- **Size**: 60mm × 12mm
- **Type**: Jewellery tag paper
- **Advantage**: No cutting needed
- **Where**: Jewellery supply stores

### Option 2: A4 Sticker Sheets
- **Size**: A4 (210mm × 297mm)
- **Type**: Printable sticker paper
- **Advantage**: Easy to print
- **Where**: Office supply stores

### Option 3: Regular Paper + Lamination
- **Size**: A4 regular paper
- **Type**: 80-100 GSM
- **Process**: Print → Cut → Laminate
- **Advantage**: Most durable

---

## 🔧 Troubleshooting

### Tags too small/large when printed
**Solution**: Ensure printer scale is 100%, not "Fit to page"

### Barcode not scanning
**Solution**: 
- Print at higher quality
- Ensure barcode is not cut off
- Clean scanner lens

### Text too small to read
**Solution**: This is normal for tags. Text is optimized for 60mm width.

### Fold line not visible
**Solution**: Dashed lines are subtle. Look for the gap between sections.

### Tags not aligned on A4
**Solution**: Check printer margins are set to 8mm

---

## 📊 Database Status Flow

```
1. TAGGED    → Item created in system
2. PRINTED   → Tag physically printed (auto-marked)
3. STOCKED   → Item scanned into warehouse
4. DISTRIBUTED → Sent to branch
5. SOLD      → Sold to customer
```

**After printing**, items are automatically marked as "PRINTED" in the database.

---

## 🎯 Quality Checklist

Before using tags in production:

- [ ] Tag dimensions are exactly 60mm × 12mm
- [ ] All text is readable
- [ ] Barcode scans successfully
- [ ] Fold line is clear
- [ ] Information is correct
- [ ] Paper quality is good
- [ ] Attachment method works
- [ ] Tags survive handling

---

## 📞 Need Help?

### Common Questions

**Q: Can I change tag size?**  
A: Yes, edit `print.css` → `.tag-unfolded` dimensions

**Q: Can I add logo?**  
A: Yes, add image in `BarcodePrintSheet.tsx` → `.tag-front`

**Q: Can I print on different paper?**  
A: Yes, but maintain 60mm × 12mm dimensions

**Q: How many tags per batch?**  
A: Unlimited, but 21 tags fit per A4 sheet

---

## ✨ Summary

**Your jewellery tag system is now production-ready!**

✅ Industry-standard format  
✅ Professional appearance  
✅ Easy to print  
✅ Scannable barcodes  
✅ Complete information  
✅ Database integration  

**Next**: Print your first batch and test the workflow! 🎉
