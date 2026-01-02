# 📊 Warehouse Reports System - Complete Guide

## Overview
Comprehensive Excel reporting system for warehouse operations with customizable filters and multiple report types.

---

## 🎯 Report Types

### 1. **Export All Data** (Green Button)
**Purpose**: Complete warehouse data export with applied filters

**Contents**:
- All item details (barcode, serial, category, design, location)
- Pricing information (cost price, CP type)
- Status and timestamps
- Distribution and sales data
- Return information

**Use Cases**:
- Complete data backup
- Detailed analysis in Excel
- Custom reporting
- Data migration

**Excel Structure**:
```
Single Sheet: "Warehouse Report"
Columns:
- Barcode
- Serial
- Category
- Design
- Location
- Weight
- Cost Price
- CP Type
- Status
- Item Name
- Tagged At
- Printed At
- Stocked At
- Distributed At
- Distributed To
- Sold At
- Returned At
- Return Reason
```

---

### 2. **Stock Report** (Blue Button)
**Purpose**: Current warehouse stock analysis

**Contents**:
- Items with status = "stocked"
- Category-wise grouping
- Weight and cost summaries
- Stock-in details

**Use Cases**:
- Inventory management
- Stock valuation
- Category-wise stock analysis
- Warehouse capacity planning

**Excel Structure**:
```
Sheet 1: "Summary"
- Category
- Total Items
- Total Weight
- Avg Cost Price

Sheet 2: "Stock Details"
- Barcode
- Serial
- Category
- Design
- Location
- Weight
- Cost Price
- CP Type
- Item Name
- Stocked At
- Stocked By
```

**Example Summary**:
| Category | Total Items | Total Weight | Avg Cost Price |
|----------|-------------|--------------|----------------|
| Ring     | 150         | 125.50g      | ₹5,250         |
| Necklace | 80          | 320.75g      | ₹12,500        |
| Bracelet | 45          | 95.25g       | ₹3,800         |

---

### 3. **Distribution Report** (Purple Button)
**Purpose**: Track items distributed to shops

**Contents**:
- Items with status = "distributed"
- Shop-wise grouping
- Distribution timestamps
- Cost tracking

**Use Cases**:
- Shop inventory tracking
- Distribution analysis
- Pending sales tracking
- Shop-wise stock value

**Excel Structure**:
```
Sheet 1: "Summary by Shop"
- Shop
- Total Items
- Total Weight
- Total Cost

Sheet 2: "Distribution Details"
- Barcode
- Serial
- Category
- Design
- Item Name
- Weight
- Cost Price
- Distributed To
- Distributed At
- Distributed By
```

**Example Summary**:
| Shop | Total Items | Total Weight | Total Cost |
|------|-------------|--------------|------------|
| Mumbai Malad | 120 | 250.50g | ₹6,50,000 |
| Pune | 85 | 180.25g | ₹4,25,000 |
| Sangli | 60 | 120.75g | ₹3,00,000 |

---

### 4. **Balance Report** (Orange Button)
**Purpose**: Overall warehouse balance sheet

**Contents**:
- Status-wise summary
- Category-wise summary
- Cross-tabulation (Category × Status)

**Use Cases**:
- Management reporting
- Business intelligence
- Trend analysis
- Performance metrics

**Excel Structure**:
```
Sheet 1: "Status Summary"
- Status
- Count
- Percentage

Sheet 2: "Category Summary"
- Category
- Count
- Percentage

Sheet 3: "Balance by Category"
- Category
- Tagged
- Printed
- Stocked
- Distributed
- Sold
- Returned
- Total
```

**Example Balance**:
| Category | Tagged | Printed | Stocked | Distributed | Sold | Returned | Total |
|----------|--------|---------|---------|-------------|------|----------|-------|
| Ring     | 10     | 15      | 150     | 120         | 450  | 5        | 750   |
| Necklace | 5      | 8       | 80      | 85          | 280  | 3        | 461   |
| Bracelet | 3      | 5       | 45      | 60          | 180  | 2        | 295   |

---

## 🔍 Filter System

### Available Filters

#### 1. **Category Filter**
- Filter by specific jewellery category
- Options: All Categories, Ring, Necklace, Bracelet, etc.
- Dynamically loaded from database

#### 2. **Location Filter**
- Filter by warehouse location
- Options: All Locations, Mumbai Malad, Pune, Sangli, etc.
- Dynamically loaded from database

#### 3. **Status Filter**
- Filter by item status
- Options:
  - All Statuses
  - Tagged (just created)
  - Printed (labels printed)
  - Stocked (in warehouse)
  - Distributed (sent to shop)
  - Sold (sold to customer)
  - Returned (returned from shop)

#### 4. **Date Range Filter**
- **Date From**: Start date (inclusive)
- **Date To**: End date (inclusive, end of day)
- Filters based on "Tagged At" timestamp

### Filter Behavior

**AND Logic**: All filters are combined with AND logic
```
Example:
Category = Ring
Location = Mumbai Malad
Status = Stocked
Date From = 2025-01-01

Result: Rings from Mumbai Malad that are stocked and tagged after Jan 1, 2025
```

**Filter Counter**: Shows "Showing X of Y items" based on active filters

**Clear Filters**: Reset all filters to default (all)

---

## 📊 Dashboard Statistics

### Overall Statistics Card
```
┌─────────────────────────┐
│  📦 Total Items         │
│  1,506                  │
│  Across all statuses    │
└─────────────────────────┘
```

### Status Breakdown (6 Cards)
```
🏷️ Tagged      🖨️ Printed     ✅ Stocked
   18             28            275

🚚 Distributed  🛍️ Sold        ↩️ Returned
   265            910            10
```

### Category Breakdown
```
💎 Ring          💎 Necklace     💎 Bracelet
   750 items        461 items       295 items
   49.8%            30.6%           19.6%
```

---

## 🔄 Workflow

### Step 1: View Dashboard
1. Open "Warehouse Reports" page
2. View real-time statistics
3. Analyze status and category breakdowns

### Step 2: Apply Filters (Optional)
1. Click "Show Filters" button
2. Select desired filters:
   - Category (e.g., Ring)
   - Location (e.g., Mumbai Malad)
   - Status (e.g., Stocked)
   - Date range
3. View filtered count: "Showing X of Y items"

### Step 3: Export Report
1. Choose report type:
   - **Export All Data**: Complete filtered data
   - **Stock Report**: Current stock analysis
   - **Distribution Report**: Shop-wise distribution
   - **Balance Report**: Overall balance sheet
2. Click corresponding button
3. Wait for Excel generation
4. File downloads automatically

### Step 4: Analyze in Excel
1. Open downloaded Excel file
2. Multiple sheets available (depending on report type)
3. Use Excel features:
   - Pivot tables
   - Charts
   - Formulas
   - Conditional formatting

---

## 📁 File Naming Convention

```
Export All Data:      Warehouse_Report_2025-12-23.xlsx
Stock Report:         Stock_Report_2025-12-23.xlsx
Distribution Report:  Distribution_Report_2025-12-23.xlsx
Balance Report:       Balance_Report_2025-12-23.xlsx
```

Format: `{ReportType}_Report_{YYYY-MM-DD}.xlsx`

---

## 💡 Use Case Examples

### Use Case 1: Monthly Stock Audit
```
Goal: Audit all items in stock for December 2025

Steps:
1. Click "Show Filters"
2. Set Status = "Stocked"
3. Set Date From = 2025-12-01
4. Set Date To = 2025-12-31
5. Click "Stock Report"
6. Analyze in Excel
```

### Use Case 2: Shop Performance Analysis
```
Goal: Analyze items distributed to Mumbai Malad shop

Steps:
1. Click "Show Filters"
2. Set Location = "Mumbai Malad"
3. Set Status = "Distributed"
4. Click "Distribution Report"
5. Review shop-wise summary
```

### Use Case 3: Category-wise Balance
```
Goal: Get balance sheet for all Ring items

Steps:
1. Click "Show Filters"
2. Set Category = "Ring"
3. Click "Balance Report"
4. View status breakdown for Rings
```

### Use Case 4: Year-end Report
```
Goal: Complete data export for 2025

Steps:
1. Click "Show Filters"
2. Set Date From = 2025-01-01
3. Set Date To = 2025-12-31
4. Click "Export All Data"
5. Archive for records
```

---

## 🎨 Visual Indicators

### Status Colors
- 🟡 **Tagged**: Gray (just created)
- 🔵 **Printed**: Blue (labels printed)
- 🟢 **Stocked**: Green (in warehouse)
- 🟣 **Distributed**: Purple (sent to shop)
- 🟡 **Sold**: Yellow (sold to customer)
- 🔴 **Returned**: Red (returned from shop)

### Dashboard Cards
- **Total Items**: Blue gradient
- **Status Cards**: Color-coded by status
- **Category Cards**: Consistent design with percentage

---

## 🔐 Data Accuracy

### Real-time Updates
- Dashboard refreshes on page load
- Statistics calculated from live database
- No caching (always current data)

### Filter Accuracy
- Filters applied client-side for instant results
- No data loss during filtering
- Original data preserved

### Export Accuracy
- Exports filtered data exactly as shown
- Timestamps formatted for readability
- All fields included (no truncation)

---

## 📊 Excel Features

### Automatic Formatting
- Headers in bold
- Date/time formatted
- Numbers aligned right
- Text aligned left

### Multiple Sheets
- Organized by data type
- Summary sheets for quick overview
- Detail sheets for deep analysis

### Data Types
- Text: Barcode, Category, Status
- Numbers: Serial, Cost Price, Weight
- Dates: All timestamps
- Formulas: Can be added in Excel

---

## 🐛 Troubleshooting

### No Items to Export
**Problem**: "No items to export with current filters"  
**Solution**: 
- Clear filters and try again
- Check if database has items
- Verify filter criteria

### Excel Not Downloading
**Problem**: File doesn't download  
**Solution**:
- Check browser download settings
- Allow downloads from this site
- Check disk space

### Wrong Data in Report
**Problem**: Report shows unexpected data  
**Solution**:
- Verify filters are correct
- Check date range format
- Reload page and try again

### Missing Columns
**Problem**: Some columns missing in Excel  
**Solution**:
- This is expected (optional fields)
- "-" indicates no data
- Check item details in database

---

## 📈 Performance

### Load Time
- Dashboard: ~1-2 seconds
- Export: ~2-5 seconds (depends on item count)
- Filters: Instant (client-side)

### Scalability
- Handles 10,000+ items efficiently
- Excel export optimized
- No pagination needed

### Browser Compatibility
- Chrome: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Edge: ✅ Fully supported

---

## 🎯 Best Practices

### Regular Exports
1. Export balance report weekly
2. Export stock report before audits
3. Export distribution report monthly
4. Archive all reports for records

### Filter Usage
1. Use specific filters for targeted analysis
2. Clear filters between different analyses
3. Verify filter count before export
4. Document filter criteria used

### Excel Analysis
1. Create pivot tables for trends
2. Use charts for visualization
3. Add formulas for calculations
4. Save analyzed files separately

### Data Management
1. Keep exports organized by date
2. Use consistent naming convention
3. Archive old reports
4. Backup important analyses

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Scheduled automatic exports
- [ ] Email reports
- [ ] PDF export option
- [ ] Custom column selection
- [ ] Report templates
- [ ] Chart generation in Excel
- [ ] Comparison reports (month-over-month)
- [ ] Trend analysis

---

## 📞 Support

### Common Questions

**Q: Can I export specific columns only?**  
A: Currently exports all columns. Use Excel to hide unwanted columns.

**Q: How often should I export reports?**  
A: Weekly for balance, monthly for distribution, as needed for others.

**Q: Can I schedule automatic exports?**  
A: Not yet. Planned for future release.

**Q: What's the maximum items I can export?**  
A: No limit. System handles large datasets efficiently.

**Q: Can I customize the Excel format?**  
A: After export, you can format in Excel. Template customization coming soon.

---

**Last Updated**: December 23, 2025  
**Version**: 3.0 (Advanced Reporting)
