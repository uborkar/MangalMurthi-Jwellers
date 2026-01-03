# Where to Find Return Reports 📍

## Quick Answer

### 🎯 Return Reports Location:
```
Sidebar → Shops → Return Report
URL: /shops/return-report
```

## Complete Return Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    RETURN MANAGEMENT                         │
└─────────────────────────────────────────────────────────────┘

1️⃣ PROCESS RETURNS
   📍 Location: Sidebar → Shops → Sales Return
   🔗 URL: /shops/sales-return
   
   ✅ Customer returns (sold items)
   ✅ Warehouse returns (unsold items)
   ✅ Barcode scanning
   ✅ Return reasons

2️⃣ VIEW RETURN REPORTS
   📍 Location: Sidebar → Shops → Return Report
   🔗 URL: /shops/return-report
   
   ✅ Customer return history
   ✅ Warehouse return history
   ✅ Statistics & analytics
   ✅ Excel export

3️⃣ MANAGE RETURNED ITEMS (Warehouse)
   📍 Location: Sidebar → Warehouse → Returned Items
   🔗 URL: /warehouse/returned-items
   
   ✅ View items at warehouse
   ✅ Update return status
   ✅ Restock items
```

## Sidebar Menu Structure

```
📂 Shops
   ├── 🏪 Branch Stock
   ├── 💰 Billing
   ├── 📋 Sale Order
   ├── 📊 Sales Report
   ├── 🔄 Sales Return          ← Process returns here
   ├── 📈 Return Report         ← View reports here ⭐
   ├── 💸 Shop Expenses
   ├── 📊 Expense Report
   ├── 🔀 Shop Transfer
   ├── 📊 Transfer Report
   └── 📄 CA Report

📂 Warehouse
   ├── 📦 Stock In
   ├── 🏷️ Tagging
   ├── 🚚 Distribution
   ├── 📊 Reports
   ├── 🔄 Returns
   └── 📦 Returned Items        ← Warehouse side
```

## What Each Page Does

### 1. Sales Return (`/shops/sales-return`)
**Purpose:** Process new returns

**Features:**
- Search invoices
- View recent invoices
- Select items to return
- Scan barcodes
- Choose return reasons
- Process returns

**Who uses it:** Shop staff processing returns

### 2. Return Report (`/shops/return-report`) ⭐
**Purpose:** View and analyze return history

**Features:**
- View all returns
- Filter by date/branch/type
- See statistics
- Export to Excel
- View details

**Who uses it:** Managers, accountants, analysts

### 3. Returned Items (`/warehouse/returned-items`)
**Purpose:** Manage items at warehouse

**Features:**
- View warehouse returns
- Update status
- Restock items
- Track inventory

**Who uses it:** Warehouse staff

## Data Flow

```
Customer Return:
Customer → Shop Staff → Sales Return Page → Return Report
                                          ↓
                                    Shop Inventory

Warehouse Return:
Shop → Sales Return Page → Warehouse → Returned Items Page
                              ↓
                        Return Report
```

## Quick Access Guide

### For Shop Staff:
```
Daily Task: Process returns
Go to: Shops → Sales Return
```

### For Managers:
```
Daily Task: Review return reports
Go to: Shops → Return Report ⭐
```

### For Warehouse:
```
Daily Task: Receive returns
Go to: Warehouse → Returned Items
```

### For Accountants:
```
Monthly Task: Export return data
Go to: Shops → Return Report → Export Excel
```

## Report Features Summary

### 📊 Return Report Page Shows:

**Statistics:**
- Customer returns count & value
- Warehouse returns count & value
- Total returns
- Total value

**Filters:**
- Date range (from/to)
- Branch (all or specific)
- Return type (all/customer/warehouse)

**Tables:**
- Customer returns with invoice details
- Warehouse returns with cost prices
- Return reasons
- Status tracking

**Actions:**
- View details (eye icon)
- Export to Excel
- Refresh data

## Common Questions

### Q: Where do I see return history?
**A:** Shops → Return Report

### Q: Where do I process new returns?
**A:** Shops → Sales Return

### Q: Where do I export return data?
**A:** Shops → Return Report → Export Excel button

### Q: Where do I see warehouse returns?
**A:** Shops → Return Report (filter: Warehouse Returns)

### Q: Where do I update return status?
**A:** Warehouse → Returned Items

### Q: Can I see both customer and warehouse returns together?
**A:** Yes! Shops → Return Report (filter: All Returns)

## Remember

✅ **Sales Return** = Process new returns
✅ **Return Report** = View history & analytics ⭐
✅ **Returned Items** = Warehouse management

The Return Report is your one-stop shop for all return analytics! 🎯
