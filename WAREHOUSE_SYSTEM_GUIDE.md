# 📦 Unified Warehouse Management System - Complete Guide

## 🎯 Overview

The Unified Warehouse Management System consolidates all warehouse operations into a single, streamlined workflow with status-based tracking. All items flow through one collection (`warehouseItems`) with different statuses representing their lifecycle stage.

---

## 🔄 Item Lifecycle & Status Flow

```
tagged → printed → stocked → distributed → sold
                      ↓
                  returned → stocked (re-stock)
```

### Status Definitions

| Status | Description | Location |
|--------|-------------|----------|
| **tagged** | Item created, barcode generated | Tagging page |
| **printed** | Labels printed, ready for stock-in | Stock-In page |
| **stocked** | In warehouse inventory | Distribution page |
| **distributed** | Sent to shop/branch | Shop systems |
| **sold** | Sold to customer | Shop systems |
| **returned** | Returned from shop to warehouse | Returns page |

---

## 📊 Database Structure

### Collections

#### 1. `warehouseItems` (Main Collection)
Single source of truth for all items.

```typescript
{
  id: string;
  barcode: string;              // MG-RNG-MAL-25-000001
  serial: number;               // 1, 2, 3...
  category: string;             // Ring, Necklace, Bracelet
  subcategory: string;          // Design/Pattern
  categoryCode: string;         // RNG, NCK, BRC
  location: string;             // Mumbai Malad, Pune, Sangli
  locationCode: string;         // MAL, PUN, SAN
  weight: string;
  costPrice: number;
  costPriceType: string;        // CP-A, CP-B
  sellingPrice?: number;
  status: ItemStatus;           // Current lifecycle stage
  
  // Timestamps
  taggedAt: string;
  printedAt?: string;
  stockedAt?: string;
  distributedAt?: string;
  soldAt?: string;
  returnedAt?: string;
  
  // Metadata
  remark: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}
```

#### 2. `counters` (Serial Tracking)
Category-wise serial counters.

```typescript
{
  id: string;                   // MG-RNG-25, MG-NCK-25
  lastSerial: number;           // Last used serial
  updatedAt: string;
}
```

---

## 🛠️ Core Features

### 1. **Tagging Page** (`/warehouse/tagging`)

**Purpose**: Generate barcodes and create new items

**Features**:
- ✅ Category-wise serial tracking
- ✅ Batch generation (1-1000 items)
- ✅ Barcode preview
- ✅ Print selected items
- ✅ Save to database
- ✅ **NEW: View Tagged Items** - See all items in database
- ✅ **NEW: Migrate Old Data** - Move from old collections
- ✅ **NEW: Clear All Data** - Reset system (with safety)

**Workflow**:
1. Select category, location, quantity
2. Click "Generate Tags" → Reserves serials
3. Review generated barcodes
4. Select items to print
5. Click "Print Selected" → Opens print window
6. Click "Save All" → Saves to `warehouseItems` with status `tagged`

**Serial Tracking**:
- Each category has independent serials
- Counter format: `MG-{CATEGORY_CODE}-{YEAR}`
- Example: `MG-RNG-25` for Rings in 2025
- Atomic serial reservation prevents duplicates

---

### 2. **Stock-In Page** (`/warehouse/stock-in`)

**Purpose**: Receive printed items into warehouse stock

**Features**:
- ✅ Barcode scanner support
- ✅ Shows items with status `printed` or `tagged`
- ✅ Category grouping
- ✅ Batch stock-in
- ✅ Real-time status updates

**Workflow**:
1. Scan barcode or select items manually
2. Items appear in "Scanned Items" section
3. Click "Stock In Selected" → Updates status to `stocked`
4. Items now available for distribution

---

### 3. **Distribution Page** (`/warehouse/distribution`)

**Purpose**: Send stocked items to shops/branches

**Features**:
- ✅ Shows items with status `stocked`
- ✅ Filter by category, search
- ✅ Select shop/branch
- ✅ Batch distribution
- ✅ Tracks distribution history

**Workflow**:
1. Select shop from dropdown
2. Filter and select items
3. Click "Distribute to Shop" → Updates status to `distributed`
4. Records shop name and timestamp

---

### 4. **Reports Page** (`/warehouse/reports`)

**Purpose**: Analytics and data export

**Features**:
- ✅ Status-wise item counts
- ✅ Category-wise breakdown
- ✅ Total value by status
- ✅ Excel export with full details
- ✅ Real-time statistics

**Metrics**:
- Items by status (tagged, printed, stocked, distributed, sold, returned)
- Items by category
- Total cost price by status
- Export to Excel for detailed analysis

---

### 5. **Dashboard** (`/`)

**Purpose**: Overview and quick access

**Features**:
- ✅ **NEW: Warehouse Overview** - Real-time stats for all statuses
- ✅ **NEW: Quick Actions** - One-click navigation to key pages
- ✅ Visual status indicators with counts and values
- ✅ Color-coded status cards

---

## 🔧 Data Migration

### Migrating from Old System

The system includes a migration utility to move data from old collections:

**Old Collections**:
- `warehouse/tagged_items/items`
- `warehouse/warehouse_stock/items`
- `warehouse/inventory/items`

**Migration Process**:
1. Go to Tagging page
2. Scroll to "Tagged Items Management"
3. Click "Migrate Old Data"
4. Confirms and shows results
5. All items moved to `warehouseItems` with appropriate status

**What Gets Migrated**:
- Tagged items → status: `tagged`
- Warehouse stock → status: `stocked`
- Inventory items → status: `stocked`

---

## 🎨 Barcode Format

```
MG-{CATEGORY}-{LOCATION}-{YEAR}-{SERIAL}
```

**Examples**:
- `MG-RNG-MAL-25-000001` - Ring, Mumbai Malad, 2025, Serial 1
- `MG-NCK-PUN-25-000042` - Necklace, Pune, 2025, Serial 42
- `MG-BRC-SAN-25-000123` - Bracelet, Sangli, 2025, Serial 123

**Category Codes**:
- RNG - Ring
- NCK - Necklace
- BRC - Bracelet
- EAR - Earring
- BNG - Bangle
- CHN - Chain
- PND - Pendant
- ANK - Anklet
- NOS - Nose Pin
- TOE - Toe Ring
- MNG - Mangalsutra

**Location Codes**:
- MAL - Mumbai Malad
- PUN - Pune
- SAN - Sangli

---

## 🔐 Data Safety

### Clear All Data (DANGER!)

**Location**: Tagging page → Tagged Items Management

**What It Does**:
- Deletes ALL items from `warehouseItems`
- Resets ALL counters
- Cannot be undone!

**Safety Measures**:
- Requires typing "DELETE ALL" to confirm
- Shows confirmation dialog
- Reports number of items deleted

**Use Cases**:
- Testing/development
- Starting fresh
- Fixing corrupted data

---

## 📈 Best Practices

### 1. **Workflow Order**
Always follow the status flow:
```
Tagging → Stock-In → Distribution → (Shop Operations)
```

### 2. **Serial Management**
- Never manually edit serials
- Use "Generate Tags" to reserve serials
- Each category maintains independent serials

### 3. **Data Integrity**
- Always save items after generating tags
- Print labels before stock-in
- Verify barcodes during stock-in

### 4. **Regular Backups**
- Export reports regularly
- Use Excel export for backup
- Keep migration data until verified

---

## 🐛 Troubleshooting

### Items Not Showing After Migration
**Solution**: Click "View Tagged Items" button to refresh the list

### Serial Numbers Duplicated
**Solution**: System uses atomic counters - duplicates shouldn't occur. If they do, clear and regenerate.

### Items Stuck in Wrong Status
**Solution**: Use appropriate page to move items:
- `tagged` → Stock-In page
- `printed` → Stock-In page
- `stocked` → Distribution page

### Migration Shows 0 Items
**Solution**: Check if old collections exist and have data. Migration only works if old data exists.

---

## 📱 UI Components

### New Components Created

1. **WarehouseStats** (`src/components/warehouse/WarehouseStats.tsx`)
   - Real-time status counts
   - Total values by status
   - Color-coded cards

2. **QuickActions** (`src/components/warehouse/QuickActions.tsx`)
   - Quick navigation buttons
   - Common operations
   - Visual action cards

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Barcode scanner mobile app
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-warehouse support
- [ ] Automated reordering
- [ ] Integration with accounting systems

---

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review the code comments
3. Test in development environment
4. Contact system administrator

---

## ✅ System Status

**Current Version**: 2.0 (Unified System)
**Last Updated**: December 2024
**Status**: ✅ Production Ready

**Key Improvements**:
- ✅ Single source of truth
- ✅ Status-based tracking
- ✅ Category-wise serials
- ✅ Migration utility
- ✅ Real-time dashboard
- ✅ Data management tools

---

**Happy Warehousing! 📦✨**
