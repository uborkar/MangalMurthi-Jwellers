# Salesperson Tracking System

## Overview
Simple salesperson tracking system with unique IDs that work across all branches. Each salesperson has a unique ID (e.g., SP001, SP002) so their sales can be tracked regardless of which branch they work at.

## How It Works

### 1. Centralized Data
All salespersons are stored in `src/data/salespersons.ts` with:
- **Unique ID**: SP001, SP002, etc. (never changes)
- **Name**: Full name of the salesperson
- **Primary Branch**: Their main assigned branch
- **Active Status**: Whether currently employed

### 2. Usage in Bills & Bookings
When creating:
- **Sales Bills**: Salesperson dropdown shows all active salespersons
- **Sales Bookings**: Same dropdown available
- **Stored as**: Only the ID (e.g., "SP001") is saved in the database
- **Displayed as**: Full name is shown in invoices/receipts

### 3. Cross-Branch Tracking
✅ **Scenario**: Rajesh Kumar (SP001) from Sangli branch sells at Miraj
- His ID (SP001) is recorded with the sale
- Reports can track all sales by SP001 across any branch
- His primary branch remains Sangli for assignment purposes

## Adding New Salespersons

Edit `src/data/salespersons.ts` and add a new entry:

```typescript
export const SALESPERSONS: Salesperson[] = [
  // ... existing entries ...
  
  // New salesperson
  { id: "SP016", name: "New Employee Name", primaryBranch: "Sangli", active: true },
];
```

**Rules**:
- Use next sequential ID (SP016, SP017, etc.)
- Use proper capitalization for name
- Set correct primary branch
- Set active: true for new employees
- Set active: false to deactivate (don't delete)

## Current Salespersons

| ID    | Name              | Primary Branch | Status |
|-------|-------------------|----------------|--------|
| SP001 | Rajesh Kumar      | Sangli         | Active |
| SP002 | Priya Sharma      | Sangli         | Active |
| SP003 | Amit Patil        | Sangli         | Active |
| SP004 | Suresh Desai      | Miraj          | Active |
| SP005 | Sneha Joshi       | Miraj          | Active |
| SP006 | Vikram More       | Miraj          | Active |
| SP007 | Ganesh Kulkarni   | Kolhapur       | Active |
| SP008 | Pooja Rane        | Kolhapur       | Active |
| SP009 | Rahul Pawar       | Kolhapur       | Active |
| SP010 | Kiran Shah        | Mumbai         | Active |
| SP011 | Neha Gupta        | Mumbai         | Active |
| SP012 | Anil Mehta        | Mumbai         | Active |
| SP013 | Sachin Bhosale    | Pune           | Active |
| SP014 | Kavita Deshpande  | Pune           | Active |
| SP015 | Manoj Shinde      | Pune           | Active |

## Database Storage

### Invoice Document (Example)
```javascript
{
  invoiceId: "INV-001",
  branch: "Miraj",
  salespersonName: "SP001",  // ← Stored as ID
  customerName: "John Doe",
  // ... other fields
}
```

### Reporting Queries
To get all sales by a salesperson:
```javascript
const sales = await getDocs(
  query(
    collection(db, "shops/Sangli/invoices"),
    where("salespersonName", "==", "SP001")
  )
);
```

## Benefits

✅ **Cross-Branch Tracking**: Sales tracked by ID, not name
✅ **No Duplicates**: Unique IDs prevent confusion
✅ **Easy Updates**: Change name in one place, reflects everywhere
✅ **Branch Flexibility**: Salesperson can work at any branch
✅ **Simple Implementation**: Just a dropdown, no complex logic
✅ **Report Ready**: Query by ID for accurate commission/performance tracking

## User Interface

In the application, users see:
- **Dropdown**: "Rajesh Kumar (SP001) - Sangli"
- **Invoices**: "Emp Name: Rajesh Kumar"
- **Database**: Stores "SP001"

This keeps it simple while enabling powerful tracking!
