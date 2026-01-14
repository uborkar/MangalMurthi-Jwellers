// src/firebase/caReports.ts - Firebase functions for CA Reports
import { db } from "./config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import {
  PurchaseRecord,
  SalesRecord,
  PurchaseReturnRecord,
  SalesReturnRecord,
  GSTSummary,
  SupplierWiseSummary,
  CustomerWiseSummary,
  ProductWiseSummary,
  CAReportFilters,
} from "../types/caReports";

// ═══════════════════════════════════════════════════════════════════════
// PURCHASE REPORTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all purchase records within date range
 * Maps from warehouse inventory items (stocked items represent purchases)
 */
export async function getPurchaseRecords(
  filters: CAReportFilters
): Promise<PurchaseRecord[]> {
  try {
    console.log("Loading purchase records with filters:", filters);

    // Get data from warehouse items collection (all statuses)
    const warehouseRef = collection(db, "warehouse", "inventory", "items");
    const snapshot = await getDocs(warehouseRef);

    console.log("Total warehouse items found:", snapshot.docs.length);

    let records: PurchaseRecord[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        // Only include items that have been stocked (these represent purchases)
        if (data.status !== "stocked" && data.status !== "distributed" && data.status !== "sold") {
          return null;
        }

        // Parse date from createdAt or timestamp
        const itemDate = data.createdAt || data.timestamp || new Date().toISOString();

        // Calculate GST (3% for jewellery: 1.5% CGST + 1.5% SGST)
        const taxableValue = data.costPrice || 0;
        const cgstRate = 1.5;
        const sgstRate = 1.5;
        const cgstAmount = (taxableValue * cgstRate) / 100;
        const sgstAmount = (taxableValue * sgstRate) / 100;

        return {
          id: doc.id,
          date: itemDate,
          supplierName: data.supplierName || "Direct Purchase",
          supplierGSTIN: data.supplierGSTIN || "",
          invoiceNumber: data.invoiceNumber || `WH-${data.serial || doc.id.slice(0, 8)}`,
          invoiceDate: itemDate,

          // Jewellery fields from your warehouse structure
          itemDescription: `${data.category || "Item"} - ${data.subcategory || ""}`.trim(),
          category: data.category || "Jewellery",
          design: data.subcategory || data.design || "",
          weight: parseFloat(data.weight || 0),
          purity: data.costPriceType || "", // Using costPriceType as purity indicator
          rate: data.costPrice || 0,

          // Pricing
          baseAmount: taxableValue,
          makingCharges: 0,
          stoneCharges: 0,

          // GST
          taxableValue,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate: 0,
          igstAmount: 0,

          totalValue: taxableValue + cgstAmount + sgstAmount,
          createdAt: itemDate,
        } as PurchaseRecord;
      })
      .filter((record): record is PurchaseRecord => record !== null);

    console.log("Mapped purchase records:", records.length);

    // Client-side date filtering
    records = records.filter((record) => {
      const recordDate = record.date.split("T")[0];
      if (filters.dateFrom && recordDate < filters.dateFrom) return false;
      if (filters.dateTo && recordDate > filters.dateTo) return false;
      if (filters.supplierName && record.supplierName !== filters.supplierName)
        return false;
      if (filters.category && record.category !== filters.category) return false;
      return true;
    });

    console.log("Filtered purchase records:", records.length);
    return records;
  } catch (error) {
    console.error("Error fetching purchase records:", error);
    return [];
  }
}

/**
 * Get supplier-wise purchase summary (Jewellery specific)
 */
export async function getSupplierWiseSummary(
  filters: CAReportFilters
): Promise<SupplierWiseSummary[]> {
  const records = await getPurchaseRecords(filters);

  const supplierMap = new Map<string, SupplierWiseSummary>();

  records.forEach((record) => {
    const key = record.supplierName;
    if (!supplierMap.has(key)) {
      supplierMap.set(key, {
        supplierName: record.supplierName,
        supplierGSTIN: record.supplierGSTIN,
        totalPurchases: 0,
        totalWeight: 0,
        totalTax: 0,
        invoiceCount: 0,
        records: [],
      });
    }

    const summary = supplierMap.get(key)!;
    summary.totalPurchases += record.totalValue;
    summary.totalWeight += record.weight;
    summary.totalTax +=
      record.cgstAmount + record.sgstAmount + record.igstAmount;
    summary.invoiceCount += 1;
    summary.records.push(record);
  });

  return Array.from(supplierMap.values()).sort(
    (a, b) => b.totalPurchases - a.totalPurchases
  );
}

/**
 * Get product-wise purchase summary (Jewellery specific)
 */
export async function getProductWisePurchaseSummary(
  filters: CAReportFilters
): Promise<ProductWiseSummary[]> {
  const records = await getPurchaseRecords(filters);

  const productMap = new Map<string, ProductWiseSummary>();

  records.forEach((record) => {
    const key = `${record.category}-${record.design || "Standard"}`;
    if (!productMap.has(key)) {
      productMap.set(key, {
        category: record.category || "Jewellery",
        design: record.design,
        totalWeight: 0,
        totalValue: 0,
        totalMakingCharges: 0,
        totalStoneCharges: 0,
        totalTax: 0,
        recordCount: 0,
      });
    }

    const summary = productMap.get(key)!;
    summary.totalWeight += record.weight;
    summary.totalValue += record.totalValue;
    summary.totalMakingCharges += record.makingCharges || 0;
    summary.totalStoneCharges += record.stoneCharges || 0;
    summary.totalTax +=
      record.cgstAmount + record.sgstAmount + record.igstAmount;
    summary.recordCount += 1;
  });

  return Array.from(productMap.values()).sort(
    (a, b) => b.totalValue - a.totalValue
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SALES REPORTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get all sales records within date range
 * Maps from shop invoices collection (where Billing.tsx saves data)
 * Also fetches from bookings for advance tracking
 */
export async function getSalesRecords(
  filters: CAReportFilters
): Promise<SalesRecord[]> {
  try {
    const shops = ["Sangli", "Miraj", "Kolhapur", "Mumbai", "Pune"];
    let allRecords: SalesRecord[] = [];

    console.log("📊 Loading sales records with filters:", filters);

    for (const shop of shops) {
      if (filters.shopName && shop !== filters.shopName) continue;

      // ✅ FIXED: Get from INVOICES collection (where Billing.tsx saves)
      const invoicesRef = collection(db, "shops", shop, "invoices");

      let snapshot;
      try {
        snapshot = await getDocs(query(invoicesRef, orderBy("createdAt", "desc")));
      } catch (err) {
        console.log(`No invoices collection for ${shop}, trying sales...`);
        // Fallback to sales collection if invoices doesn't exist
        const salesRef = collection(db, "shops", shop, "sales");
        snapshot = await getDocs(query(salesRef, orderBy("createdAt", "desc")));
      }

      console.log(`📦 Found ${snapshot.docs.length} invoices in ${shop}`);

      const shopRecords: SalesRecord[] = snapshot.docs.flatMap((doc) => {
        const data = doc.data();

        // Each invoice has multiple items stored in 'items' array
        const items = data.items || [];

        // If no items array, treat the whole document as a single item
        if (items.length === 0) {
          return [{
            id: doc.id,
            date: data.createdAt || data.date || new Date().toISOString(),
            customerName: data.customerName || "Walk-in Customer",
            customerGSTIN: data.customerGSTIN || "",
            customerPhone: data.customerPhone || "",
            customerAddress: data.customerAddress || "",
            placeOfSupply: data.placeOfSupply || "27", // Default Maharashtra
            invoiceNumber: data.invoiceId || data.invoiceNo || doc.id,
            invoiceDate: data.createdAt || data.date || new Date().toISOString(),

            itemDescription: "Sales Invoice",
            category: "Gold",
            design: "",
            weight: 0,
            purity: "",

            goldRate: 0,
            makingCharges: 0,
            stoneCharges: 0,

            // GST from totals
            taxableValue: data.totals?.taxable || 0,
            cgstRate: data.gstSettings?.cgst || 1.5,
            cgstAmount: data.totals?.cgst || 0,
            sgstRate: data.gstSettings?.sgst || 1.5,
            sgstAmount: data.totals?.sgst || 0,
            igstRate: data.gstSettings?.igst || 0,
            igstAmount: data.totals?.igst || 0,

            totalValue: data.totals?.grandTotal || 0,
            shopName: shop,
            createdAt: data.createdAt || new Date().toISOString(),
          } as SalesRecord];
        }

        // Map each item from the invoice
        return items.map((item: any, index: number) => {
          // Calculate GST for item if not provided
          const taxableValue = item.taxableAmount || item.sellingPrice || item.costPrice || 0;
          const cgstRate = data.gstSettings?.cgst || 1.5;
          const sgstRate = data.gstSettings?.sgst || 1.5;
          const igstRate = data.gstSettings?.igst || 0;

          // Determine if IGST or CGST+SGST based on gstType
          const isIGST = data.gstType === "igst";

          const cgstAmount = isIGST ? 0 : (taxableValue * cgstRate) / 100;
          const sgstAmount = isIGST ? 0 : (taxableValue * sgstRate) / 100;
          const igstAmount = isIGST ? (taxableValue * igstRate) / 100 : 0;

          return {
            id: `${doc.id}-${index}`,
            date: data.createdAt || data.date || new Date().toISOString(),
            customerName: data.customerName || "Walk-in Customer",
            customerGSTIN: data.customerGSTIN || "",
            customerPhone: data.customerPhone || "",
            customerAddress: data.customerAddress || "",
            placeOfSupply: data.placeOfSupply || "27", // Default Maharashtra
            invoiceNumber: data.invoiceId || data.invoiceNo || doc.id,
            invoiceDate: data.createdAt || data.date || new Date().toISOString(),

            // Item details from Billing.tsx structure
            itemDescription: `${item.category || "Jewellery"} - ${item.subcategory || item.barcode || ""}`.trim(),
            category: item.category || "Gold",
            design: item.subcategory || "",
            weight: parseFloat(item.weight) || 0,
            purity: item.type || item.purity || "",

            // Pricing
            goldRate: item.costPrice || 0,
            makingCharges: 0,
            stoneCharges: 0,

            // GST
            taxableValue,
            cgstRate,
            cgstAmount,
            sgstRate,
            sgstAmount,
            igstRate,
            igstAmount,

            totalValue: taxableValue + cgstAmount + sgstAmount + igstAmount,
            shopName: shop,
            createdAt: data.createdAt || new Date().toISOString(),
          } as SalesRecord;
        });
      });

      allRecords = allRecords.concat(shopRecords);
    }

    console.log(`📊 Total records before filtering: ${allRecords.length}`);

    // Client-side date filtering
    allRecords = allRecords.filter((record) => {
      const recordDate = record.date.split("T")[0];
      if (filters.dateFrom && recordDate < filters.dateFrom) return false;
      if (filters.dateTo && recordDate > filters.dateTo) return false;
      if (filters.customerName && record.customerName !== filters.customerName) return false;
      if (filters.category && record.category !== filters.category) return false;
      return true;
    });

    console.log(`📊 Total records after filtering: ${allRecords.length}`);

    return allRecords.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error("❌ Error fetching sales records:", error);
    return [];
  }
}

/**
 * Get customer-wise sales summary (Jewellery specific)
 */
export async function getCustomerWiseSummary(
  filters: CAReportFilters
): Promise<CustomerWiseSummary[]> {
  const records = await getSalesRecords(filters);

  const customerMap = new Map<string, CustomerWiseSummary>();

  records.forEach((record) => {
    const key = record.customerName;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerName: record.customerName,
        customerGSTIN: record.customerGSTIN,
        customerPhone: record.customerPhone,
        totalSales: 0,
        totalWeight: 0,
        totalTax: 0,
        invoiceCount: 0,
        records: [],
      });
    }

    const summary = customerMap.get(key)!;
    summary.totalSales += record.totalValue;
    summary.totalWeight += record.weight;
    summary.totalTax +=
      record.cgstAmount + record.sgstAmount + record.igstAmount;
    summary.invoiceCount += 1;
    summary.records.push(record);
  });

  return Array.from(customerMap.values()).sort(
    (a, b) => b.totalSales - a.totalSales
  );
}

/**
 * Get product-wise sales summary (Jewellery specific)
 */
export async function getProductWiseSalesSummary(
  filters: CAReportFilters
): Promise<ProductWiseSummary[]> {
  const records = await getSalesRecords(filters);

  const productMap = new Map<string, ProductWiseSummary>();

  records.forEach((record) => {
    const key = `${record.category}-${record.design || "Standard"}`;
    if (!productMap.has(key)) {
      productMap.set(key, {
        category: record.category || "Jewellery",
        design: record.design,
        totalWeight: 0,
        totalValue: 0,
        totalMakingCharges: 0,
        totalStoneCharges: 0,
        totalTax: 0,
        recordCount: 0,
      });
    }

    const summary = productMap.get(key)!;
    summary.totalWeight += record.weight;
    summary.totalValue += record.totalValue;
    summary.totalMakingCharges += record.makingCharges || 0;
    summary.totalStoneCharges += record.stoneCharges || 0;
    summary.totalTax +=
      record.cgstAmount + record.sgstAmount + record.igstAmount;
    summary.recordCount += 1;
  });

  return Array.from(productMap.values()).sort(
    (a, b) => b.totalValue - a.totalValue
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GST SUMMARY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate GST summary from records (Jewellery specific)
 */
export function calculateGSTSummary(
  records: (PurchaseRecord | SalesRecord)[]
): GSTSummary {
  return records.reduce(
    (summary, record) => ({
      totalTaxableValue: summary.totalTaxableValue + record.taxableValue,
      totalCGST: summary.totalCGST + record.cgstAmount,
      totalSGST: summary.totalSGST + record.sgstAmount,
      totalIGST: summary.totalIGST + record.igstAmount,
      totalInvoiceValue: summary.totalInvoiceValue + record.totalValue,
      recordCount: summary.recordCount + 1,
      totalWeight: (summary.totalWeight || 0) + (record.weight || 0),
    }),
    {
      totalTaxableValue: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      totalInvoiceValue: 0,
      recordCount: 0,
      totalWeight: 0,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PURCHASE & SALES RETURNS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get purchase return records
 */
export async function getPurchaseReturnRecords(
  filters: CAReportFilters
): Promise<PurchaseReturnRecord[]> {
  try {
    const returnsRef = collection(db, "warehouse", "purchases", "returns");
    const snapshot = await getDocs(query(returnsRef, orderBy("returnDate", "desc")));

    let records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PurchaseReturnRecord[];

    // Client-side filtering
    records = records.filter((record) => {
      const recordDate = record.returnDate.split("T")[0];
      if (filters.dateFrom && recordDate < filters.dateFrom) return false;
      if (filters.dateTo && recordDate > filters.dateTo) return false;
      return true;
    });

    return records;
  } catch (error) {
    console.error("Error fetching purchase return records:", error);
    return [];
  }
}

/**
 * Get sales return records
 */
export async function getSalesReturnRecords(
  filters: CAReportFilters
): Promise<SalesReturnRecord[]> {
  try {
    const shops = ["Sangli", "Miraj", "Kolhapur"];
    let allRecords: SalesReturnRecord[] = [];

    for (const shop of shops) {
      if (filters.shopName && shop !== filters.shopName) continue;

      const returnsRef = collection(db, "shops", shop, "salesReturns");
      const snapshot = await getDocs(query(returnsRef, orderBy("returnDate", "desc")));

      const shopRecords = snapshot.docs.map((doc) => ({
        id: doc.id,
        shopName: shop,
        ...doc.data(),
      })) as SalesReturnRecord[];

      allRecords = allRecords.concat(shopRecords);
    }

    // Client-side filtering
    allRecords = allRecords.filter((record) => {
      const recordDate = record.returnDate.split("T")[0];
      if (filters.dateFrom && recordDate < filters.dateFrom) return false;
      if (filters.dateTo && recordDate > filters.dateTo) return false;
      return true;
    });

    return allRecords;
  } catch (error) {
    console.error("Error fetching sales return records:", error);
    return [];
  }
}
