# Implementation Roadmap - Jewelry Billing Software

## 🎯 Project Goal
Complete the jewelry billing software with proper warehouse flow, shop management, and barcode-based tracking system.

---

## 📋 PHASE 1: FIX CRITICAL ISSUES (Priority: URGENT)

### 1.1 Fix Data Flow Architecture

#### Problem
Items are being duplicated across multiple collections instead of proper status tracking.

#### Solution: Unified Status-Based Flow

**New Data Model**:
```typescript
interface WarehouseItem {
  id: string;
  barcode: string; // MG-RNG-MAL-25-000001
  
  // Category info
  category: string; // Ring, Necklace, etc.
  subcategory: string; // Design/Pattern
  
  // Physical attributes
  weight: string;
  purity: string;
  location: string;
  
  // Pricing
  costPrice: number;
  sellingPrice?: number;
  
  // Status tracking (SINGLE SOURCE OF TRUTH)
  status: "tagged" | "printed" | "stocked" | "distributed" | "sold" | "returned";
  
  // Workflow timestamps
  taggedAt: string;
  printedAt?: string;
  stockedAt?: string;
  distributedAt?: string;
  distributedTo?: string; // Shop name
  soldAt?: string;
  returnedAt?: string;
  
  // Metadata
  serial: number;
  categoryCode: string;
  locationCode: string;
  year: number;
  remark: string;
  costPriceType: string;
  
  // Audit
  createdBy: string;
  updatedAt: string;
}
```

**Status Flow**:
```
tagged → printed → stocked → distributed → sold
                                      ↓
                                  returned → stocked
```

#### Implementation Steps

**Step 1**: Create unified collection
```typescript
// src/firebase/warehouseItems.ts
const ITEMS_COLLECTION = collection(db, "warehouse", "items");

export async function updateItemStatus(
  itemId: string, 
  newStatus: ItemStatus,
  metadata?: Record<string, any>
) {
  const updates = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...metadata
  };
  
  // Add timestamp for status
  if (newStatus === "printed") updates.printedAt = new Date().toISOString();
  if (newStatus === "stocked") updates.stockedAt = new Date().toISOString();
  if (newStatus === "distributed") updates.distributedAt = new Date().toISOString();
  if (newStatus === "sold") updates.soldAt = new Date().toISOString();
  
  await updateDoc(doc(ITEMS_COLLECTION, itemId), updates);
}
```

**Step 2**: Update Tagging page
- Save items with status: "tagged"
- After printing, update status to "printed"

**Step 3**: Remove Categorization page
- Not needed with status-based flow
- Approval happens during stock-in

**Step 4**: Update Stock-In page
- Load items with status: "printed"
- On stock-in, update status to "stocked"
- Add stockedAt timestamp

**Step 5**: Update Distribution page
- Load items with status: "stocked"
- On distribution, update status to "distributed"
- Add distributedTo and distributedAt

---

### 1.2 Add Barcode Scanning Component

#### Create Barcode Scanner Hook

```typescript
// src/hooks/useBarcodeScanner.ts
import { useEffect, useState } from 'react';

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const [buffer, setBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // Reset buffer if more than 100ms between keys (human typing)
      if (currentTime - lastKeyTime > 100) {
        setBuffer('');
      }
      
      setLastKeyTime(currentTime);
      
      // Enter key = end of barcode
      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          onScan(buffer);
          setBuffer('');
        }
        e.preventDefault();
        return;
      }
      
      // Accumulate characters
      if (e.key.length === 1) {
        setBuffer(prev => prev + e.key);
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [buffer, lastKeyTime, onScan]);
}
```

#### Create Barcode Scanner Component

```typescript
// src/components/common/BarcodeScanner.tsx
import { useState } from 'react';
import { Scan, X } from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
}

export function BarcodeScanner({ onScan, placeholder }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  
  useBarcodeScanner((barcode) => {
    setLastScanned(barcode);
    onScan(barcode);
    setTimeout(() => setLastScanned(''), 2000);
  });
  
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Scan className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
            placeholder={placeholder || "Scan barcode or type manually..."}
            className="pl-10 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
          />
          {manualInput && (
            <button
              onClick={() => setManualInput('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={handleManualSubmit}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
        >
          Add
        </button>
      </div>
      
      {lastScanned && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300">
          ✅ Scanned: <span className="font-mono font-bold">{lastScanned}</span>
        </div>
      )}
    </div>
  );
}
```

---

### 1.3 Add Validation System

#### Create Validation Utilities

```typescript
// src/utils/validation.ts

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validators = {
  // Barcode format: MG-RNG-MAL-25-000001
  barcode: (value: string): boolean => {
    const pattern = /^MG-[A-Z]{3}-[A-Z]{3}-\d{2}-\d{6}$/;
    if (!pattern.test(value)) {
      throw new ValidationError('Invalid barcode format');
    }
    return true;
  },
  
  // Weight must be positive
  weight: (value: number): boolean => {
    if (value <= 0) {
      throw new ValidationError('Weight must be greater than 0');
    }
    if (value > 1000) {
      throw new ValidationError('Weight seems too high (max 1000g)');
    }
    return true;
  },
  
  // Price must be positive
  price: (value: number): boolean => {
    if (value < 0) {
      throw new ValidationError('Price cannot be negative');
    }
    if (value > 10000000) {
      throw new ValidationError('Price seems too high');
    }
    return true;
  },
  
  // Serial must be positive integer
  serial: (value: number): boolean => {
    if (!Number.isInteger(value) || value <= 0) {
      throw new ValidationError('Serial must be a positive integer');
    }
    return true;
  },
  
  // Category must exist
  category: (value: string, validCategories: string[]): boolean => {
    if (!validCategories.includes(value)) {
      throw new ValidationError(`Invalid category: ${value}`);
    }
    return true;
  },
  
  // Status transition validation
  statusTransition: (from: string, to: string): boolean => {
    const validTransitions: Record<string, string[]> = {
      tagged: ['printed'],
      printed: ['stocked'],
      stocked: ['distributed', 'returned'],
      distributed: ['sold', 'returned'],
      sold: ['returned'],
      returned: ['stocked'],
    };
    
    if (!validTransitions[from]?.includes(to)) {
      throw new ValidationError(`Cannot transition from ${from} to ${to}`);
    }
    return true;
  },
};

// Validate item before saving
export function validateWarehouseItem(item: Partial<WarehouseItem>): void {
  if (!item.barcode) throw new ValidationError('Barcode is required');
  validators.barcode(item.barcode);
  
  if (!item.category) throw new ValidationError('Category is required');
  
  if (item.weight) {
    const weightNum = parseFloat(item.weight);
    validators.weight(weightNum);
  }
  
  if (item.costPrice !== undefined) {
    validators.price(item.costPrice);
  }
  
  if (item.serial) {
    validators.serial(item.serial);
  }
}
```

---

## 📋 PHASE 2: COMPLETE WAREHOUSE SECTION

### 2.1 Redesign Stock-In Page

**New Features**:
- Barcode scanner integration
- Load only printed items
- Validate before stock-in
- Bulk stock-in with confirmation
- Real-time statistics

**Implementation**:
```typescript
// src/pages/Warehouse/StockIn.tsx (Redesigned)

export default function StockIn() {
  const [printedItems, setPrintedItems] = useState<WarehouseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Load printed items (status: "printed")
  useEffect(() => {
    loadPrintedItems();
  }, []);
  
  const loadPrintedItems = async () => {
    const items = await getItemsByStatus("printed");
    setPrintedItems(items);
  };
  
  // Barcode scanner handler
  const handleBarcodeScan = async (barcode: string) => {
    const item = printedItems.find(i => i.barcode === barcode);
    
    if (!item) {
      toast.error(`Item not found: ${barcode}`);
      return;
    }
    
    if (item.status !== "printed") {
      toast.error(`Item already stocked: ${barcode}`);
      return;
    }
    
    // Auto-select scanned item
    setSelectedIds(prev => new Set(prev).add(item.id));
    toast.success(`Added: ${barcode}`);
  };
  
  // Stock-in selected items
  const handleStockIn = async () => {
    const items = printedItems.filter(i => selectedIds.has(i.id));
    
    if (items.length === 0) {
      toast.error('No items selected');
      return;
    }
    
    const loadingToast = toast.loading(`Stocking in ${items.length} items...`);
    
    try {
      // Update status to "stocked" for all selected items
      await Promise.all(
        items.map(item => 
          updateItemStatus(item.id, "stocked", {
            stockedAt: new Date().toISOString(),
            stockedBy: "current-user" // TODO: Get from auth
          })
        )
      );
      
      toast.dismiss(loadingToast);
      toast.success(`✅ Successfully stocked ${items.length} items!`);
      
      // Reload
      setSelectedIds(new Set());
      await loadPrintedItems();
      
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to stock items');
      console.error(error);
    }
  };
  
  return (
    <TASection title="📦 Stock-In" subtitle="Scan and stock printed items">
      {/* Barcode Scanner */}
      <BarcodeScanner 
        onScan={handleBarcodeScan}
        placeholder="Scan barcode to add to stock-in..."
      />
      
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 my-6">
        <StatCard title="Printed Items" value={printedItems.length} />
        <StatCard title="Selected" value={selectedIds.size} />
        <StatCard title="Ready to Stock" value={selectedIds.size} />
      </div>
      
      {/* Items Table */}
      <ItemsTable 
        items={printedItems}
        selectedIds={selectedIds}
        onToggleSelect={(id) => {
          const newSet = new Set(selectedIds);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          setSelectedIds(newSet);
        }}
      />
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={() => setSelectedIds(new Set())}>
          Deselect All
        </button>
        <button 
          onClick={handleStockIn}
          disabled={selectedIds.size === 0}
          className="btn-primary"
        >
          Stock In ({selectedIds.size})
        </button>
      </div>
    </TASection>
  );
}
```

---

### 2.2 Create Warehouse Reports Page

**Features**:
- Stock summary by category
- Serial tracking report
- Transfer history
- Status-wise breakdown
- Export to Excel/PDF

**Implementation**:
```typescript
// src/pages/Warehouse/WarehouseReports.tsx

export default function WarehouseReports() {
  const [reportType, setReportType] = useState<'summary' | 'transfers' | 'serials'>('summary');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [data, setData] = useState<any[]>([]);
  
  // Generate stock summary report
  const generateSummaryReport = async () => {
    const items = await getAllWarehouseItems();
    
    const summary = items.reduce((acc, item) => {
      const key = item.category;
      if (!acc[key]) {
        acc[key] = {
          category: key,
          total: 0,
          tagged: 0,
          printed: 0,
          stocked: 0,
          distributed: 0,
          sold: 0,
          totalValue: 0,
        };
      }
      
      acc[key].total++;
      acc[key][item.status]++;
      acc[key].totalValue += item.costPrice || 0;
      
      return acc;
    }, {} as Record<string, any>);
    
    setData(Object.values(summary));
  };
  
  // Generate transfer history report
  const generateTransferReport = async () => {
    const items = await getItemsByStatus('distributed');
    
    const transfers = items.map(item => ({
      barcode: item.barcode,
      category: item.category,
      distributedTo: item.distributedTo,
      distributedAt: item.distributedAt,
      value: item.costPrice,
    }));
    
    setData(transfers);
  };
  
  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `warehouse_report_${Date.now()}.xlsx`);
  };
  
  return (
    <TASection title="📊 Warehouse Reports">
      {/* Report Type Selector */}
      <div className="flex gap-3 mb-6">
        <button 
          onClick={() => setReportType('summary')}
          className={reportType === 'summary' ? 'btn-primary' : 'btn-secondary'}
        >
          Stock Summary
        </button>
        <button 
          onClick={() => setReportType('transfers')}
          className={reportType === 'transfers' ? 'btn-primary' : 'btn-secondary'}
        >
          Transfer History
        </button>
        <button 
          onClick={() => setReportType('serials')}
          className={reportType === 'serials' ? 'btn-primary' : 'btn-secondary'}
        >
          Serial Tracking
        </button>
      </div>
      
      {/* Date Range Filter */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <input type="date" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
        <input type="date" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
        <button onClick={generateSummaryReport} className="btn-primary">
          Generate Report
        </button>
      </div>
      
      {/* Report Table */}
      <ReportTable data={data} type={reportType} />
      
      {/* Export Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={exportToExcel} className="btn-secondary">
          Export to Excel
        </button>
      </div>
    </TASection>
  );
}
```

---

### 2.3 Create Returns Page

**Features**:
- Return from shops to warehouse
- Return reason tracking
- Barcode scanning
- Status update to "returned"
- Re-stock functionality

**Implementation**: Similar to Stock-In but with return workflow

---

## 📋 PHASE 3: ENHANCE SHOP SECTION

### 3.1 Enhance Billing Page

**New Features**:
- Barcode scanner for quick item addition
- Simplified UI (fewer editable fields)
- Payment method tracking (Cash/Card/UPI)
- Customer database integration
- Quick billing mode

**Implementation**:
```typescript
// Simplified billing with barcode scanner
const handleBarcodeScan = async (barcode: string) => {
  const item = branchStock.find(i => i.label === barcode);
  
  if (!item) {
    toast.error(`Item not found: ${barcode}`);
    return;
  }
  
  if (item.status === 'sold') {
    toast.error(`Item already sold: ${barcode}`);
    return;
  }
  
  // Auto-add to bill
  addItemToBill(item);
  toast.success(`Added: ${item.label}`);
};
```

---

### 3.2 Create Sales Report Page

**Features**:
- Daily/weekly/monthly sales
- Category-wise analysis
- Salesman performance
- Payment method breakdown
- Export to Excel/PDF

---

### 3.3 Create Sales Return Page

**Features**:
- Invoice lookup
- Return reason
- Refund calculation
- Stock adjustment

---

### 3.4 Create Shop Expense Page

**Features**:
- Expense entry
- Category management
- Monthly reports

---

### 3.5 Create Shop Transfer Page

**Features**:
- Inter-shop transfer
- Transfer request workflow
- Approval system

---

## 📋 PHASE 4: ACCOUNTS SECTION

### 4.1 Ledger Management
### 4.2 Party Accounts
### 4.3 Payment Tracking
### 4.4 Purchase Orders
### 4.5 Reports (P&L, Balance Sheet)
### 4.6 GST Filing Support

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Review this roadmap** with stakeholders
2. **Start with Phase 1** (Fix critical issues)
3. **Test each phase** before moving to next
4. **Deploy incrementally** to production
5. **Gather feedback** and iterate

---

**Document Version**: 1.0  
**Last Updated**: December 20, 2025  
**Status**: Ready for Implementation
