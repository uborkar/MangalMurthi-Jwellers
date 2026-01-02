# 📊 Warehouse Reports - Quick Reference Card

## 🎯 4 Report Types

| Button | Report | Sheets | Use For |
|--------|--------|--------|---------|
| 🟢 Export All Data | Complete data | 1 | Backup, custom analysis |
| 🔵 Stock Report | Current stock | 2 | Inventory, stock audit |
| 🟣 Distribution Report | Shop inventory | 2 | Shop tracking, sales |
| 🟠 Balance Report | Balance sheet | 3 | Management, BI |

---

## 🔍 5 Filters

| Filter | Options | Filters By |
|--------|---------|------------|
| Category | All, Ring, Necklace, etc. | Item category |
| Location | All, Mumbai, Pune, etc. | Warehouse location |
| Status | All, Tagged, Stocked, etc. | Item status |
| Date From | Date picker | Tagged date (start) |
| Date To | Date picker | Tagged date (end) |

**Logic**: All filters combined with AND

---

## 📁 Excel Structure

### Stock Report
```
Sheet 1: Summary (by category)
Sheet 2: Stock Details (all items)
```

### Distribution Report
```
Sheet 1: Summary by Shop
Sheet 2: Distribution Details
```

### Balance Report
```
Sheet 1: Status Summary
Sheet 2: Category Summary
Sheet 3: Balance by Category (matrix)
```

---

## 🔄 Quick Workflows

### Monthly Stock Audit
```
1. Show Filters
2. Set date range (month)
3. Set Status = Stocked
4. Click "Stock Report"
```

### Shop Performance
```
1. Show Filters
2. Set Location = Shop name
3. Set Status = Distributed
4. Click "Distribution Report"
```

### Category Analysis
```
1. Show Filters
2. Set Category = Ring
3. Click "Balance Report"
```

### Complete Backup
```
1. No filters needed
2. Click "Export All Data"
```

---

## 📊 Dashboard Cards

### Status Cards (6)
- 🏷️ Tagged (gray)
- 🖨️ Printed (blue)
- ✅ Stocked (green)
- 🚚 Distributed (purple)
- 🛍️ Sold (yellow)
- ↩️ Returned (red)

### Category Cards
- Shows count and percentage
- Sorted by count (descending)
- Dynamic from database

---

## 💡 Pro Tips

1. **Clear filters** between different analyses
2. **Export weekly** balance reports for records
3. **Use Excel pivot tables** for deeper insights
4. **Archive files** with date in filename
5. **Verify filter count** before exporting

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| No items to export | Clear filters or check database |
| Excel not downloading | Check browser download settings |
| Wrong data | Verify filter criteria |
| Missing columns | Optional fields show "-" |

---

## 📈 File Names

```
Warehouse_Report_2025-12-23.xlsx
Stock_Report_2025-12-23.xlsx
Distribution_Report_2025-12-23.xlsx
Balance_Report_2025-12-23.xlsx
```

Format: `{Type}_Report_{Date}.xlsx`

---

## ✅ Quick Checklist

Before Export:
- [ ] Filters set correctly
- [ ] Date range valid
- [ ] Item count verified
- [ ] Report type selected

After Export:
- [ ] File downloaded
- [ ] Data looks correct
- [ ] All sheets present
- [ ] File archived

---

**Version**: 3.0 | **Updated**: Dec 23, 2025
