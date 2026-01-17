# Daily Shop Expense Report - PDF Export Feature

## Overview
Enhanced the **Shop Expense Report** page with a new PDF export feature that generates daily expense reports in a format matching your uploaded bank statement style.

## Features Implemented

### 1. **Print Daily Reports (PDF)** Button
- Added a new purple "Print Daily Reports (PDF)" button next to the Excel export button
- Uses the Printer icon from lucide-react
- Generates one page per day within the selected date range

### 2. **PDF Format Structure**
Each page in the PDF includes:

#### Header
- Company name: MANGALMURTHI JEWELLERS
- Red banner with "DAILY BRANCH REPORT"
- Date in DD/MM/YYYY format
- Branch name

#### Transactions Table (Yellow Highlighted)
- Opening Balance
- Gold Sale
- Gold GST  
- Gold Advance
- Stone Sale
- Stone GST
- Stone Advance
- Cash Received (various categories)

#### Expenses Table (Yellow Highlighted)
- Category column
- Description column
- Amount column (right-aligned)
- Empty rows added to maintain consistent format

#### Summary Section
- **TOTAL row** (yellow background) - Total income
- **BALANCE row** (red background) - Net balance (Income - Expenses)

### 3. **Date Range Support**
The PDF generator:
- Loops through each day in the selected date range (From Date to To Date)
- Creates a separate page for each day
- Includes days even if no transactions were recorded (shows zero values)
- Uses actual data if available from Firebase

### 4. **Styling Features**
- Yellow (#ffff99) highlighting for transaction/expense rows
- Bold yellow (#ffff00) headers
- Red (#ff0000) background for balance row
- Black borders for all table cells
- Professional table layout with proper padding
- Print-optimized for A4 paper size

## How to Use

1. **Navigate** to Shop Expense Report page
2. **Select Date Range**: Choose "From Date" and "To Date"
3. **Select Branch**: Choose specific branch or "All"
4. **Click "Print Daily Reports (PDF)"** button
5. **Print Dialog** will open automatically showing all daily reports
6. **Save as PDF** using your browser's print dialog

## Technical Details

- Uses `window.open()` to create a new print window
- Generates HTML dynamically for each day
- Implements `page-break-after: always` for multi-page PDFs
- Uses `-webkit-print-color-adjust: exact` to preserve colors in PDF
- Auto-triggers print dialog on page load
- Compatible with all modern browsers

## Example Output
Each page will look like your uploaded image:
- Clean, professional layout
- Yellow-highlighted tables for easy reading
- Red balance row for quick visual identification
- Consistent formatting across all pages

## Benefits
1. **Bank Statement Style**: Matches familiar format users already understand
2. **Complete Date Range**: One PDF contains all days in selected period
3. **Easy Review**: Each day on separate page for focused review
4. **Professional**: Ready to print or save as PDF for records
5. **Flexible**: Works with any date range selected

## Files Modified
- `src/pages/Shops/ShopExpenseReport.tsx`
  - Added `Printer` icon import
  - Added `exportToPDF()` function (167 lines)
  - Added "Print Daily Reports (PDF)" button to UI

---

**Created**: 2026-01-17  
**Feature**: Daily Expense PDF Export with Bank Statement Format
