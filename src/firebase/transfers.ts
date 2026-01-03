// src/firebase/transfers.ts
import { db } from "./config";
import {
  addDoc,
  collection,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { InventoryItem } from "./inventory";

export interface TransferRow {
  id: string;
  label: string;
  category: string;
  weight?: string;
  quantity: number;
}

export interface ShopTransferRow {
  label: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  location?: string; // MUST HAVE - Location field
  type?: string; // costPriceType (CP-A, CP-B, etc.)
  weight?: string;
  quantity: number;
  stockItemId?: string; // Reference to the stock item being transferred
}

export interface TransferPayload {
  fromShop: string;
  toShop: string;
  date: string;
  rows: TransferRow[];
  totals: {
    totalQty: number;
    totalWeight: number;
  };
}

const TRANSFER_COLLECTION = collection(db, "warehouse", "transfers", "items");

// shop stock path: shops/<shopName>/stock/items
const shopStockCollection = (shop: string) =>
  collection(db, "shops", shop, "stock", "items");

// inventory collection for status update
const inventoryCollection = (id: string) =>
  doc(db, "warehouse", "inventory", "items", id);

export async function addTransfer(payload: TransferPayload) {
  // 1️⃣ Add transfer record under warehouse
  const transferRef = await addDoc(TRANSFER_COLLECTION, {
    ...payload,
    createdAt: payload.date,
  });

  // 2️⃣ Move each row into shop’s live stock collection
  for (const row of payload.rows) {
    await addDoc(shopStockCollection(payload.toShop), {
      ...row,
      fromTransfer: transferRef.id,
      createdAt: payload.date,
      status: "in-stock"
    });

    // 3️⃣ Update inventory → Mark It as Transferred
    await updateDoc(inventoryCollection(row.id), {
      transferred: true,
      transferShop: payload.toShop,
      transferId: transferRef.id,
      transferredAt: payload.date,
    });
  }

  return transferRef;
}

// ========== Shop-to-Shop Transfer ==========

export interface ShopTransferPayload {
  fromShop: string;
  toShop: string;
  rows: ShopTransferRow[];
  transportBy?: string;
  remarks?: string;
  date: string;
  totals: {
    totalQty: number;
    totalWeight: string;
  };
}

export interface ShopTransferLog extends ShopTransferPayload {
  id?: string;
  transferNo: string;
  createdAt: string;
  missingLabels?: string[];
  transferredItems?: any[]; // List of successfully transferred items
  originalTransferNo?: string; // For return transfers, reference to original
}

/**
 * Perform shop-to-shop transfer (INDUSTRY STANDARD)
 * 1. Mark items as "transferred" in source shop (DON'T DELETE)
 * 2. Create complete copy in destination shop with all data
 * 3. Log the transfer with complete audit trail
 * 4. Maintain data integrity and history
 */
export async function performShopTransfer(
  payload: ShopTransferPayload
): Promise<ShopTransferLog> {
  try {
    const { fromShop, toShop, rows, transportBy, remarks, date, totals } = payload;

    // Generate transfer number
    const transferNo = `TRF-${new Date().getTime()}`;
    const missingLabels: string[] = [];
    const transferredItems: any[] = [];

    console.log("🚚 Starting transfer:", { fromShop, toShop, rowCount: rows.length });

    // Get source shop stock
    const sourceStockRef = collection(db, "shops", fromShop, "stockItems");
    const sourceSnap = await getDocs(sourceStockRef);
    const sourceStock = sourceSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    
    console.log("📦 Source stock loaded:", sourceStock.length, "items");

    // Process each transfer row
    for (const row of rows) {
      console.log("Processing item:", row.label);
      
      // Find item in source shop by label or barcode
      const sourceItem = sourceStock.find((item) => 
        item.label === row.label || item.barcode === row.label
      );

      if (!sourceItem) {
        console.warn("⚠️ Item not found in source:", row.label);
        missingLabels.push(row.label);
        continue; // Skip this item
      }

      console.log("✅ Item found, processing transfer:", row.label);
      
      // STEP 1: Update source item status to "transferred" (DON'T DELETE)
      const sourceDocRef = doc(db, "shops", fromShop, "stockItems", sourceItem.id);
      await updateDoc(sourceDocRef, {
        status: "transferred",
        transferredTo: toShop,
        transferredAt: date,
        transferNo: transferNo,
        transferRemarks: remarks || "",
      });

      // STEP 2: Create complete copy in destination shop with ALL data
      const destinationItem = {
        // Core identification
        label: sourceItem.label,
        barcode: sourceItem.barcode,
        
        // Product details
        productName: sourceItem.productName || "",
        category: sourceItem.category || row.category || "Unknown",
        subcategory: sourceItem.subcategory || row.subcategory || "",
        design: sourceItem.design || "",
        remark: sourceItem.remark || "",
        
        // Location and type (CRITICAL)
        location: sourceItem.location || row.location || "",
        type: sourceItem.type || sourceItem.costPriceType || row.type || "",
        costPriceType: sourceItem.costPriceType || sourceItem.type || row.type || "",
        
        // Weight information
        weight: sourceItem.weight || row.weight || "0",
        weightG: sourceItem.weightG || 0,
        
        // Pricing information
        pricingMode: sourceItem.pricingMode || "type",
        typeAmount: sourceItem.typeAmount || 0,
        basePrice: sourceItem.basePrice || 0,
        costPrice: sourceItem.costPrice || 0,
        makingCharge: sourceItem.makingCharge || 0,
        stoneCharge: sourceItem.stoneCharge || 0,
        profitPercent: sourceItem.profitPercent || 0,
        goldRate: sourceItem.goldRate || 0,
        price: sourceItem.price || 0,
        
        // Serial numbers
        serial: sourceItem.serial || 0,
        warehouseSerial: sourceItem.warehouseSerial || 0,
        
        // Status and tracking
        status: "in-branch",
        transferredFrom: fromShop,
        transferredAt: date,
        transferNo: transferNo,
        
        // References
        warehouseItemId: sourceItem.warehouseItemId || "",
        
        // Timestamps
        createdAt: date,
      };

      // Add to destination shop
      await addDoc(collection(db, "shops", toShop, "stockItems"), destinationItem);
      
      transferredItems.push({
        label: sourceItem.label,
        barcode: sourceItem.barcode,
        category: sourceItem.category,
        location: sourceItem.location,
      });

      console.log("✅ Item transferred successfully:", row.label);
    }

    // STEP 3: Save transfer log to warehouse/transfers/shopTransfers collection
    const transferLog: ShopTransferLog = {
      transferNo,
      fromShop,
      toShop,
      rows,
      transportBy: transportBy || "",
      remarks: remarks || "",
      date,
      totals,
      createdAt: new Date().toISOString(),
      missingLabels,
      transferredItems, // Add list of successfully transferred items
    };

    console.log("Saving transfer log:", transferNo);
    
    const logRef = await addDoc(
      collection(db, "warehouse", "transfers", "shopTransfers"),
      transferLog
    );

    console.log("Transfer completed successfully:", logRef.id);

    return {
      ...transferLog,
      id: logRef.id,
    };
  } catch (error) {
    console.error("Error in performShopTransfer:", error);
    throw error;
  }
}

/**
 * Reverse/Return a shop transfer (INDUSTRY STANDARD)
 * Use this to return items back to original shop
 * 
 * @param transferNo - The original transfer number to reverse
 * @param itemsToReturn - Array of item labels/barcodes to return (optional, if empty returns all)
 * @param reason - Reason for return
 * 
 * Process:
 * 1. Find original transfer log
 * 2. Find items in destination shop with this transferNo
 * 3. Update destination items status to "returned"
 * 4. Update source items status back to "in-branch"
 * 5. Create return log
 */
export async function reverseShopTransfer(
  transferNo: string,
  itemsToReturn: string[], // Labels or barcodes
  reason: string
): Promise<ShopTransferLog> {
  try {
    console.log("🔄 Starting reverse transfer:", transferNo);

    // STEP 1: Find original transfer log
    const transfersRef = collection(db, "warehouse", "transfers", "shopTransfers");
    const q = query(transfersRef, where("transferNo", "==", transferNo));
    const transferSnap = await getDocs(q);

    if (transferSnap.empty) {
      throw new Error(`Transfer ${transferNo} not found`);
    }

    const originalTransfer = transferSnap.docs[0].data() as ShopTransferLog;
    const { fromShop, toShop } = originalTransfer;

    console.log("📋 Original transfer found:", { fromShop, toShop });

    // STEP 2: Get items from destination shop with this transferNo
    const destStockRef = collection(db, "shops", toShop, "stockItems");
    const destQuery = query(destStockRef, where("transferNo", "==", transferNo));
    const destSnap = await getDocs(destQuery);

    const destinationItems = destSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    console.log("📦 Found items in destination:", destinationItems.length);

    // Filter items to return (if specific items provided)
    const itemsToProcess = itemsToReturn.length > 0
      ? destinationItems.filter(item => 
          itemsToReturn.includes(item.label) || itemsToReturn.includes(item.barcode)
        )
      : destinationItems;

    if (itemsToProcess.length === 0) {
      throw new Error("No items found to return");
    }

    console.log("🔄 Processing return for", itemsToProcess.length, "items");

    const returnedItems: any[] = [];
    const returnTransferNo = `RTN-${transferNo}-${Date.now()}`;

    // STEP 3: Process each item
    for (const item of itemsToProcess) {
      // Update destination item status to "returned"
      const destDocRef = doc(db, "shops", toShop, "stockItems", item.id);
      await updateDoc(destDocRef, {
        status: "returned",
        returnedAt: new Date().toISOString(),
        returnTransferNo: returnTransferNo,
        returnReason: reason,
      });

      // Find and update original item in source shop
      const sourceStockRef = collection(db, "shops", fromShop, "stockItems");
      const sourceQuery = query(
        sourceStockRef,
        where("label", "==", item.label),
        where("transferNo", "==", transferNo)
      );
      const sourceSnap = await getDocs(sourceQuery);

      if (!sourceSnap.empty) {
        const sourceDocRef = doc(db, "shops", fromShop, "stockItems", sourceSnap.docs[0].id);
        await updateDoc(sourceDocRef, {
          status: "in-branch", // Restore to active status
          returnedAt: new Date().toISOString(),
          returnTransferNo: returnTransferNo,
          returnReason: reason,
          // Clear transfer fields
          transferredTo: null,
          transferredAt: null,
        });

        returnedItems.push({
          label: item.label,
          barcode: item.barcode,
          category: item.category,
          location: item.location,
        });

        console.log("✅ Item returned:", item.label);
      } else {
        console.warn("⚠️ Original item not found in source shop:", item.label);
      }
    }

    // STEP 4: Create return log
    const returnLog: ShopTransferLog = {
      transferNo: returnTransferNo,
      fromShop: toShop, // Reversed
      toShop: fromShop, // Reversed
      rows: itemsToProcess.map(item => ({
        label: item.label,
        barcode: item.barcode,
        category: item.category,
        subcategory: item.subcategory,
        location: item.location,
        type: item.type,
        weight: item.weight,
        quantity: 1,
      })),
      transportBy: "",
      remarks: `RETURN: ${reason} (Original: ${transferNo})`,
      date: new Date().toISOString(),
      totals: {
        totalQty: returnedItems.length,
        totalWeight: itemsToProcess.reduce((sum, item) => sum + parseFloat(item.weight || "0"), 0).toFixed(2),
      },
      createdAt: new Date().toISOString(),
      transferredItems: returnedItems,
      originalTransferNo: transferNo, // Reference to original
    };

    // Save return log
    await addDoc(
      collection(db, "warehouse", "transfers", "shopTransfers"),
      returnLog
    );

    console.log("✅ Return completed:", returnTransferNo);

    return returnLog;
  } catch (error) {
    console.error("❌ Reverse transfer failed:", error);
    throw error;
  }
}

/**
 * Get all shop transfer logs with optional filters
 */
export async function getShopTransferLogs(filters?: {
  fromShop?: string;
  toShop?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ShopTransferLog[]> {
  const logsRef = collection(db, "warehouse", "transfers", "shopTransfers");
  let q = query(logsRef);

  // Apply filters if provided
  if (filters?.fromShop) {
    q = query(q, where("fromShop", "==", filters.fromShop));
  }
  if (filters?.toShop) {
    q = query(q, where("toShop", "==", filters.toShop));
  }

  const snap = await getDocs(q);
  let logs = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as ShopTransferLog),
  }));

  // Client-side date filtering
  if (filters?.dateFrom || filters?.dateTo) {
    logs = logs.filter((log) => {
      const logDate = log.date.split("T")[0];
      if (filters.dateFrom && logDate < filters.dateFrom) return false;
      if (filters.dateTo && logDate > filters.dateTo) return false;
      return true;
    });
  }

  // Sort by date descending
  logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return logs;
}

/**
 * Get transfer statistics
 */
export interface TransferStats {
  totalTransfers: number;
  totalItems: number;
  totalWeight: number;
  byFromShop: Record<string, number>;
  byToShop: Record<string, number>;
  recentTransfers: ShopTransferLog[];
}

export async function getTransferStats(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<TransferStats> {
  const logs = await getShopTransferLogs(filters);

  const stats: TransferStats = {
    totalTransfers: logs.length,
    totalItems: 0,
    totalWeight: 0,
    byFromShop: {},
    byToShop: {},
    recentTransfers: logs.slice(0, 10),
  };

  logs.forEach((log) => {
    stats.totalItems += log.totals.totalQty;
    stats.totalWeight += parseFloat(log.totals.totalWeight || "0");

    stats.byFromShop[log.fromShop] = (stats.byFromShop[log.fromShop] || 0) + 1;
    stats.byToShop[log.toShop] = (stats.byToShop[log.toShop] || 0) + 1;
  });

  return stats;
}
