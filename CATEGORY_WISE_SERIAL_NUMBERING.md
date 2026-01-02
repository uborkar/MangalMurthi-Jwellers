# Category-Wise Serial Numbering Implementation

## ✅ What Was Changed

Implemented **category-wise serial numbering** for branch stock reports and displays. Serial numbers now restart from 1 for each category instead of continuing across all items.

---

## 📊 Before vs After

### Before (Wrong):
```
Sr No | Category | Barcode
1     | Bangle   | MG-BNG-MAL-25-000001
2     | Bangle   | MG-BNG-MAL-25-000002
3     | Bangle   | MG-BNG-MAL-25-000003
4     | Ring     | MG-RNG-MAL-25-000001
5     | Ring     | MG-RNG-MAL-25-000002
6     | Necklace | MG-NCK-MAL-25-000001
```

### After (Correct):
```
Sr No | Category | Barcode
1     | Bangle   | MG-BNG-MAL-25-000001
2     | Bangle   | MG-BNG-MAL-25-000002
3     | Bangle   | MG-BNG-MAL-25-000003

1     | Ring     | MG-RNG-MAL-25-000001
2     | Ring     | MG-RNG-MAL-25-000002

1     | Necklace | MG-NCK-MAL-25-000001
```

---

## 🔧 Technical Implementation

### 1. Excel Export - Single Branch

**File:** `src/pages/Shops/BranchStock.tsx`

**Function:** `exportToExcel()`

**Change:**
```typescript
// Before: Global serial counter
let serial = 1;
const exportData = items.map(item => ({
  "Sr No": serial++,
  ...
}));

// After: Category-wise serial counter
const exportData = Object.keys(itemsByCategory)
  .sort()
  .flatMap((categoryName) => {
    const categoryItems = itemsByCategory[categoryName];
    
    // Reset serial to 1 for each category
    let categorySerial = 1;
    
    return categoryItems.map((item) => ({
      "Sr No": categorySerial++, // Restarts at 1 for each category
      "Barcode": item.barcode,
      "Category": item.category,
      ...
    }));
  });
```

### 2. Excel Export - All Branches

**File:** `src/pages/Shops/BranchStock.tsx`

**Function:** `exportAllBranches()`

**Change:**
```typescript
// Before: Sequential numbering
const branchData = sortedItems.map((item, index) => ({
  "Sr No": index + 1,
  ...
}));

// After: Category-wise numbering
const branchData = Object.keys(itemsByCategory)
  .sort()
  .flatMap((categoryName) => {
    const categoryItems = itemsByCategory[categoryName];
    let categorySerial = 1;
    
    return categoryItems.map((item) => ({
      "Sr No": categorySerial++,
      ...
    }));
  });
```

### 3. Table Display

**File:** `src/pages/Shops/BranchStock.tsx`

**UI Rendering:**

**Change:**
```typescript
// Before: Global serial across all categories
let globalSerial = 1;
{categoryItems.map((item) => {
  const currentSerial = globalSerial++;
  return <td>{currentSerial}</td>
})}

// After: Category-wise serial (index + 1)
{categoryItems.map((item, index) => {
  const categorySerial = index + 1; // Restarts for each category
  return <td>{categorySerial}</td>
})}
```

---

## 📈 Benefits

### 1. Better Organization
- Each category has its own numbering sequence
- Easy to count items per category
- Clear visual separation

### 2. Professional Reports
- Industry-standard format
- Matches accounting practices
- Easier for auditors to review

### 3. Category Analysis
- Quick count of items per category
- Easy to spot missing items in sequence
- Better inventory management

### 4. Excel Clarity
When exported to Excel:
```
Category: Bangle
Sr No | Barcode           | Name
1     | MG-BNG-MAL-25-001 | Gold Bangle
2     | MG-BNG-MAL-25-002 | Silver Bangle
3     | MG-BNG-MAL-25-003 | Diamond Bangle

Category: Ring
Sr No | Barcode           | Name
1     | MG-RNG-MAL-25-001 | Gold Ring
2     | MG-RNG-MAL-25-002 | Silver Ring
```

---

## 🎯 Where This Applies

### 1. Branch Stock Page
- **Display:** Category-wise serial in tables
- **Export:** Category-wise serial in Excel (single branch)
- **Export All:** Category-wise serial in Excel (all branches)

### 2. Reports
All branch stock reports now show:
- Items grouped by category
- Serial numbers restart at 1 for each category
- Sorted by date within each category

---

## 📝 Important Notes

### Database Serial Numbers
The actual `serial` field in the database **remains unique** and **never changes**. This is just for **display and export purposes**.

**Database:**
```typescript
{
  id: "abc123",
  barcode: "MG-BNG-MAL-25-000001",
  serial: 1,  // Unique global serial
  category: "Bangle",
  ...
}
```

**Display/Export:**
```
Category: Bangle
Sr No: 1  ← Display serial (category-wise)
Barcode: MG-BNG-MAL-25-000001
```

### Sorting
Items within each category are sorted by:
1. `transferredAt` (when item was transferred to branch)
2. `createdAt` (when item was created)
3. Oldest first

This ensures consistent serial numbering across reports.

---

## 🧪 Testing

### Test Single Branch Export:
1. Go to Branch Stock page
2. Select a branch with multiple categories
3. Click "Export to Excel"
4. Open Excel file
5. Verify serial numbers restart at 1 for each category

### Test All Branches Export:
1. Go to Branch Stock page
2. Click "Export All Branches"
3. Open Excel file
4. Check each branch sheet
5. Verify serial numbers restart at 1 for each category in each sheet

### Test Table Display:
1. Go to Branch Stock page
2. Select a branch
3. Expand all categories
4. Verify serial numbers in table restart at 1 for each category

---

## ✅ Summary

**Changed Files:**
- `src/pages/Shops/BranchStock.tsx`

**Functions Modified:**
1. `exportToExcel()` - Single branch Excel export
2. `exportAllBranches()` - All branches Excel export
3. Table rendering - Display serial numbers

**Result:**
- ✅ Serial numbers restart at 1 for each category
- ✅ Better organized reports
- ✅ Professional format
- ✅ Industry-standard approach
- ✅ Database serial numbers unchanged

This matches how professional jewelry ERP systems display inventory reports! 💎
