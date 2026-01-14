# 📊 GST CA Reports Implementation Plan

## 🎯 Overview
Implementing industry-standard GST reports for Chartered Accountants as per Indian GST compliance requirements.

## 📋 Reports Structure

### 1. Purchase Reports (Annexure 1A & 2A)
**Annexure 1A - Purchases**
- Supplierwise Purchase Register
- Productwise Purchase Register

**Annexure 2A - Purchase Returns**
- Supplierwise Purchase Return
- Productwise Purchase Return

### 2. Sales Reports (Annexure 1A & 2A)
**Annexure 1A - Sales**
- Customerwise Sales Register
- Productwise Sales Register

**Annexure 2A - Sales Returns**
- Customerwise Sales Return
- Productwise Sales Return

## 🏗️ File Structure

```
src/
├── pages/
│   └── CA/
│       ├── CADashboard.tsx           # Main CA Reports Dashboard
│       ├── PurchaseAnnexure1A.tsx    # Purchase Register
│       ├── PurchaseAnnexure2A.tsx    # Purchase Return
│       ├── SalesAnnexure1A.tsx       # Sales Register
│       └── SalesAnnexure2A.tsx       # Sales Return
├── firebase/
│   └── caReports.ts                  # Firebase queries for CA reports
└── types/
    └── caReports.ts                  # TypeScript interfaces
```

## 📊 Data Fields (As per GST Requirements)

### Purchase Register Fields:
- Date
- Supplier Name
- Supplier GSTIN
- Invoice Number
- Invoice Date
- Product/Item Description
- HSN/SAC Code
- Quantity
- Rate
- Taxable Value
- CGST Rate & Amount
- SGST Rate & Amount
- IGST Rate & Amount
- Total Invoice Value

### Sales Register Fields:
- Date
- Customer Name
- Customer GSTIN (if B2B)
- Invoice Number
- Invoice Date
- Product/Item Description
- HSN/SAC Code
- Quantity
- Rate
- Taxable Value
- CGST Rate & Amount
- SGST Rate & Amount
- IGST Rate & Amount
- Total Invoice Value

## 🔄 Data Sources

### Purchases:
- Warehouse Stock-In records
- Supplier invoices
- Purchase orders

### Sales:
- Shop Billing records
- Sales invoices
- Customer transactions

## 📈 Features

1. **Date Range Filter** - Financial year, quarter, month, custom
2. **Export Options** - Excel, PDF, CSV
3. **GST Summary** - Total CGST, SGST, IGST
4. **Supplier/Customer Wise** - Grouped reports
5. **Product Wise** - Item-level analysis
6. **Search & Filter** - Quick data lookup
7. **Print Ready** - Formatted for CA submission

## 🎨 UI Components

- Date range picker
- Supplier/Customer dropdown
- Product category filter
- Export buttons (Excel, PDF)
- Summary cards (Total Purchase, Total Tax, etc.)
- Data tables with sorting
- Charts for visual analysis

## ✅ Implementation Steps

1. Create CA section in sidebar
2. Build CADashboard with navigation
3. Implement Purchase Annexure 1A
4. Implement Purchase Annexure 2A
5. Implement Sales Annexure 1A
6. Implement Sales Annexure 2A
7. Add Firebase queries
8. Add Excel export functionality
9. Add PDF generation
10. Testing with sample data
