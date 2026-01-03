# Return Reports - Complete Guide 📊

## Where to Find Return Reports

### 🎯 Navigation Path:
```
Sidebar → Shops → Return Report
```

**Direct URL:** `/shops/return-report`

## Features

### 1. **Dual Return Type Reporting**
- **Customer Returns** (Customer → Shop)
  - Returns from sold items
  - Shows invoice details
  - Selling price tracking
  
- **Warehouse Returns** (Shop → Warehouse)
  - Unsold/damaged items
  - Cost price tracking
  - Warehouse status

### 2. **Advanced Filtering** 🔍
- **Date Range**: From/To date selection
- **Branch Filter**: All branches or specific branch
- **Return Type**: All, Customer only, or Warehouse only

### 3. **Statistics Dashboard** 📈
Four key metrics displayed:
- Customer Returns Count & Value
- Warehouse Returns Count & Value
- Total Returns Count
- Total Value

### 4. **Detailed Tables** 📋

**Customer Returns Table:**
- Date
- Return ID
- Branch
- Invoice ID
- Barcode
- Category & Subcategory
- Weight
- Selling Price
- Return Reason
- Status
- View Details button

**Warehouse Returns Table:**
- Date
- Return ID
- Branch
- Barcode
- Category & Subcategory
- Weight
- Cost Price
- Return Reason
- Status
- View Details button

### 5. **Excel Export** 📥
- Exports both return types to separate sheets
- Professional formatting
- Color-coded headers
- All data included

### 6. **Detail Modal** 👁️
Click the eye icon on any return to see:
- Complete return information
- All fields in organized layout
- Easy-to-read format

## Data Sources

### Customer Returns:
```
Firestore Path: shops/{branch}/customerReturns
```

### Warehouse Returns:
```
Firestore Path: warehouseReturns
```

## Usage Examples

### Example 1: View All Returns for Current Month
```
1. Open Return Report page
2. Default shows current month (1st to today)
3. Select "All Branches"
4. Select "All Returns"
5. View combined report
```

### Example 2: Export Sangli Customer Returns
```
1. Set date range
2. Select Branch: "Sangli"
3. Select Return Type: "Customer Returns"
4. Click "Export Excel"
5. Download report
```

### Example 3: Check Warehouse Returns Status
```
1. Select Return Type: "Warehouse Returns"
2. Select specific branch or "All"
3. View status column
4. Click eye icon for details
```

## Statistics Breakdown

### Customer Returns Stats:
```
┌─────────────────────────────┐
│ 👈 Customer Returns         │
│ Count: 45                   │
│ Value: ₹2,45,000           │
└─────────────────────────────┘
```

### Warehouse Returns Stats:
```
┌─────────────────────────────┐
│ 🚚 Warehouse Returns        │
│ Count: 23                   │
│ Value: ₹1,85,000           │
└─────────────────────────────┘
```

### Total Returns:
```
┌─────────────────────────────┐
│ 📉 Total Returns            │
│ Count: 68                   │
│ Value: ₹4,30,000           │
└─────────────────────────────┘
```

## Excel Export Structure

### Sheet 1: Customer Returns
| Return ID | Branch | Invoice ID | Date | Barcode | Category | Subcategory | Weight | Price | Reason | Remarks | Status |
|-----------|--------|------------|------|---------|----------|-------------|--------|-------|--------|---------|--------|

### Sheet 2: Warehouse Returns
| Return ID | Branch | Date | Barcode | Category | Subcategory | Weight | Cost Price | Reason | Remarks | Status |
|-----------|--------|------|---------|----------|-------------|--------|------------|--------|---------|--------|

## Return Reasons

### Customer Return Reasons:
- Defective
- Wrong Item
- Customer Changed Mind
- Size Issue
- Quality Issue
- Other

### Warehouse Return Reasons:
- Unsold Stock
- Damaged
- Quality Issue
- Wrong Item
- Other

## Status Values

### Customer Returns:
- `returned-to-shop` - Item back in shop inventory

### Warehouse Returns:
- `pending-warehouse` - Awaiting warehouse receipt
- `received` - Received by warehouse
- `restocked` - Back in warehouse inventory

## Benefits

✅ **Comprehensive View** - See all returns in one place
✅ **Flexible Filtering** - Find exactly what you need
✅ **Export Ready** - Excel reports for analysis
✅ **Real-time Data** - Always up-to-date
✅ **Detailed Information** - Complete return context
✅ **Multi-branch Support** - All branches or specific
✅ **Financial Tracking** - Value calculations included

## Integration Points

### Related Pages:
1. **Sales Return** (`/shops/sales-return`)
   - Process new returns
   - Creates records shown in report

2. **Returned Items** (`/warehouse/returned-items`)
   - Warehouse side of returns
   - Update return status

3. **Branch Stock** (`/shops/branch-stock`)
   - See returned items in inventory
   - Track stock status

## Report Use Cases

### 1. **Monthly Return Analysis**
- Set date range to full month
- View all branches
- Export to Excel
- Analyze return patterns

### 2. **Branch Performance**
- Filter by specific branch
- Compare customer vs warehouse returns
- Identify issues

### 3. **Financial Reconciliation**
- View total return values
- Match with accounting records
- Track refunds/credits

### 4. **Quality Control**
- Filter by return reason
- Identify defective items
- Improve quality

### 5. **Inventory Management**
- Track returned items
- Plan restocking
- Manage warehouse space

## Quick Access

### From Dashboard:
```
Dashboard → Shops Section → Return Report
```

### From Sidebar:
```
Shops Menu → Return Report
```

### Direct Link:
```
/shops/return-report
```

## Tips

💡 **Tip 1**: Use date filters to focus on specific periods
💡 **Tip 2**: Export regularly for record keeping
💡 **Tip 3**: Check return reasons to identify trends
💡 **Tip 4**: Use detail modal for complete information
💡 **Tip 5**: Filter by branch for location-specific analysis

## Future Enhancements

Potential additions:
- [ ] Return reason analytics
- [ ] Trend charts
- [ ] Comparison reports
- [ ] Automated email reports
- [ ] Return rate calculations
- [ ] Customer return history
- [ ] Refund tracking

The Return Report page provides complete visibility into all return operations! 🎯
