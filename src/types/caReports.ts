// src/types/caReports.ts - Types for CA Reports (Jewellery Business)

export interface PurchaseRecord {
  id?: string;
  date: string;
  supplierName: string;
  supplierGSTIN?: string;
  invoiceNumber: string;
  invoiceDate: string;

  // Jewellery specific fields
  itemDescription: string;
  category?: string; // Gold, Silver, Diamond, etc.
  design?: string;
  weight: number; // in grams
  purity?: string; // 22K, 18K, 916, etc.
  rate: number; // per gram

  // Pricing
  baseAmount: number;
  makingCharges?: number;
  stoneCharges?: number;

  // GST
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;

  totalValue: number;
  createdAt: string;
}

export interface SalesRecord {
  id?: string;
  date: string;
  customerName: string;
  customerGSTIN?: string;
  customerPhone?: string;
  invoiceNumber: string;
  invoiceDate: string;

  // Jewellery specific fields
  itemDescription: string;
  category?: string;
  design?: string;
  weight: number;
  purity?: string;

  // Pricing
  goldRate?: number;
  makingCharges: number;
  stoneCharges: number;

  // GST
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;

  totalValue: number;
  shopName: string;
  createdAt: string;
}

export interface PurchaseReturnRecord extends PurchaseRecord {
  returnReason?: string;
  originalInvoiceNumber: string;
  returnDate: string;
}

export interface SalesReturnRecord extends SalesRecord {
  returnReason?: string;
  originalInvoiceNumber: string;
  returnDate: string;
}

export interface GSTSummary {
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalInvoiceValue: number;
  recordCount: number;
  totalWeight?: number; // Total weight in grams
}

export interface SupplierWiseSummary {
  supplierName: string;
  supplierGSTIN?: string;
  totalPurchases: number;
  totalWeight: number;
  totalTax: number;
  invoiceCount: number;
  records: PurchaseRecord[];
}

export interface CustomerWiseSummary {
  customerName: string;
  customerGSTIN?: string;
  customerPhone?: string;
  totalSales: number;
  totalWeight: number;
  totalTax: number;
  invoiceCount: number;
  records: SalesRecord[];
}

export interface ProductWiseSummary {
  category: string;
  design?: string;
  totalWeight: number;
  totalValue: number;
  totalMakingCharges: number;
  totalStoneCharges: number;
  totalTax: number;
  recordCount: number;
}

export interface CAReportFilters {
  dateFrom: string;
  dateTo: string;
  supplierName?: string;
  customerName?: string;
  category?: string;
  shopName?: string;
  purity?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// GSTR-1 SPECIFIC TYPES - Industry Standard Compliance
// ═══════════════════════════════════════════════════════════════════════

// Indian State Codes for GSTIN and Place of Supply
export const INDIAN_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

// HSN Codes for Jewellery
export const HSN_CODES: Record<string, { code: string; description: string }> = {
  "Gold": { code: "7113", description: "Articles of jewellery and parts thereof, of precious metal" },
  "Silver": { code: "7114", description: "Articles of goldsmiths' or silversmiths' wares" },
  "Diamond": { code: "7102", description: "Diamonds, whether or not worked" },
  "Platinum": { code: "7110", description: "Platinum, unwrought or in semi-manufactured forms" },
  "Gemstones": { code: "7103", description: "Precious stones (other than diamonds)" },
  "Pearls": { code: "7101", description: "Pearls, natural or cultured" },
  "Default": { code: "7113", description: "Gold Jewellery" },
};

// GSTR-1 Period Types
export type GSTR1PeriodType = "monthly" | "quarterly";

// GSTR-1 Filing Status
export type GSTR1Status = "draft" | "submitted" | "filed" | "amended";

// B2B Record - Section 4A, 4B, 4C, 6B, 6C (Registered Recipients)
export interface GSTR1B2BRecord {
  gstin: string;
  customerName: string;
  stateCode: string;
  stateName: string;
  invoices: GSTR1B2BInvoice[];
  totalInvoices: number;
  totalTaxableValue: number;
  totalTax: number;
  totalValue: number;
}

export interface GSTR1B2BInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: "Y" | "N";
  invoiceType: "Regular" | "SEZ with payment" | "SEZ without payment" | "Deemed Exp";
  ecomGSTIN?: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

// B2CL Record - Section 5A, 5B (Large B2C > ₹2.5L Inter-State)
export interface GSTR1B2CLRecord {
  stateCode: string;
  stateName: string;
  invoices: GSTR1B2CLInvoice[];
  totalInvoices: number;
  totalTaxableValue: number;
  totalTax: number;
}

export interface GSTR1B2CLInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  igstAmount: number;
  ecomGSTIN?: string;
}

// B2CS Record - Section 7 (Small B2C, Consolidated)
export interface GSTR1B2CSRecord {
  type: "OE" | "E"; // OE = Outward supplies (Excluding E-commerce), E = E-Commerce
  placeOfSupply: string;
  stateCode: string;
  stateName: string;
  supplyType: "Intra-State" | "Inter-State";
  rate: number;
  taxableValue: number;
  cessAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  ecomGSTIN?: string;
}

// Credit/Debit Notes - Section 9B (Registered), 9C (Unregistered)
export interface GSTR1CreditDebitNote {
  noteType: "C" | "D"; // C = Credit, D = Debit
  noteNumber: string;
  noteDate: string;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  customerGSTIN?: string;
  customerName: string;
  placeOfSupply: string;
  reason: string;
  noteValue: number;
  rate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  preGST: "Y" | "N";
}

// Exports - Section 6A (With Payment), 6B (Without Payment)
export interface GSTR1ExportRecord {
  exportType: "WPAY" | "WOPAY"; // With Payment / Without Payment
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  portCode: string;
  shippingBillNumber: string;
  shippingBillDate: string;
  rate: number;
  taxableValue: number;
  igstAmount: number;
  cessAmount: number;
}

// HSN Summary - Section 12
export interface GSTR1HSNRecord {
  hsnCode: string;
  description: string;
  uqc: string; // Unit Quantity Code: GMS, NOS, PCS, etc.
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
}

// Document Summary - Section 13
export interface GSTR1DocumentRecord {
  documentType: "Invoices for outward supply" | "Invoices for inward supply from unregistered person" | "Revised Invoice" | "Debit Note" | "Credit Note" | "Receipt voucher" | "Payment Voucher" | "Refund voucher" | "Delivery Challan for job work" | "Delivery Challan for supply on approval" | "Delivery Challan in case of liquid gas" | "Delivery Challan in cases other than mentioned above";
  srNoFrom: string;
  srNoTo: string;
  totalNumber: number;
  cancelled: number;
  netIssued: number;
}

// Nil/Exempt/Non-GST Supplies - Section 8A, 8B, 8C, 8D
export interface GSTR1NilExemptRecord {
  supplyType: "Nil Rated" | "Exempted" | "Non-GST";
  interStateSupply: number;
  intraStateSupply: number;
  total: number;
}

// Advances Received - Section 11A(1), 11A(2)
export interface GSTR1AdvanceRecord {
  placeOfSupply: string;
  supplyType: "Intra-State" | "Inter-State";
  rate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
}

// Advance Adjustment - Section 11B(1), 11B(2)
export interface GSTR1AdvanceAdjustmentRecord extends GSTR1AdvanceRecord {
  originalMonth: string; // Month when advance was received
}

// GSTR-1 Complete Summary
export interface GSTR1Summary {
  period: {
    type: GSTR1PeriodType;
    month?: number; // 1-12
    quarter?: number; // 1-4
    year: number;
    startDate: string;
    endDate: string;
  };
  gstin: string;
  legalName: string;
  tradeName: string;
  status: GSTR1Status;

  // Section Summaries
  b2b: {
    count: number;
    invoices: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
    totalValue: number;
  };
  b2cl: {
    count: number;
    invoices: number;
    taxableValue: number;
    igst: number;
    cess: number;
    totalValue: number;
  };
  b2cs: {
    count: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
  };
  creditNotes: {
    registered: number;
    unregistered: number;
    taxableValue: number;
    totalTax: number;
  };
  debitNotes: {
    registered: number;
    unregistered: number;
    taxableValue: number;
    totalTax: number;
  };
  exports: {
    withPayment: number;
    withoutPayment: number;
    totalValue: number;
    igst: number;
  };
  nilExempt: {
    nilRated: number;
    exempted: number;
    nonGST: number;
    total: number;
  };
  advances: {
    received: number;
    adjusted: number;
    net: number;
  };
  hsn: {
    count: number;
    totalValue: number;
    totalTax: number;
  };
  documents: {
    invoicesIssued: number;
    cancelled: number;
    netIssued: number;
  };

  // Grand Totals
  grandTotal: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
    totalValue: number;
  };

  generatedAt: string;
  generatedBy: string;
}
