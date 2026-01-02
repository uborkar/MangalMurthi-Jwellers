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
  category?: string;
  weight?: string;
  purity?: string;
  price?: number;
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
}

/**
 * Perform shop-to-shop transfer
 * 1. Remove items from source shop
 * 2. Add items to destination shop
 * 3. Log the transfer
 */
export async function performShopTransfer(
  payload: ShopTransferPayload
): Promise<ShopTransferLog> {
  try {
    const { fromShop, toShop, rows, transportBy, remarks, date, totals } = payload;

    // Generate transfer number
    const transferNo = `TRF-${new Date().getTime()}`;
    const missingLabels: string[] = [];

    console.log("Starting transfer:", { fromShop, toShop, rowCount: rows.length });

    // Get source shop stock
    const sourceStockRef = collection(db, "shops", fromShop, "stockItems");
    const sourceSnap = await getDocs(sourceStockRef);
    const sourceStock = sourceSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    
    console.log("Source stock loaded:", sourceStock.length, "items");

    // Process each transfer row
    for (const row of rows) {
      console.log("Processing row:", row.label);
      
      // Find item in source shop by label
      const sourceItem = sourceStock.find((item) => item.label === row.label);

      if (!sourceItem) {
        console.warn("Item not found in source:", row.label);
        // Item not found in source, add to missing list but still add to destination
        missingLabels.push(row.label);
        
        // Add to destination shop
        await addDoc(collection(db, "shops", toShop, "stockItems"), {
          label: row.label,
          category: row.category || "Unknown",
          weight: row.weight || "0",
          purity: row.purity || "",
          price: row.price || 0,
          status: "in-branch",
          transferredFrom: fromShop,
          transferNo: transferNo,
          createdAt: date,
        });
      } else {
        console.log("Item found, transferring:", row.label);
        
        // Item found - remove from source
        const sourceDocRef = doc(db, "shops", fromShop, "stockItems", sourceItem.id);
        await deleteDoc(sourceDocRef);

        // Add to destination shop
        await addDoc(collection(db, "shops", toShop, "stockItems"), {
          label: row.label,
          category: row.category || sourceItem.category || "Unknown",
          weight: row.weight || sourceItem.weight || "0",
          purity: row.purity || sourceItem.purity || "",
          price: row.price || sourceItem.price || 0,
          productName: sourceItem.productName || "",
          weightG: sourceItem.weightG || 0,
          pricingMode: sourceItem.pricingMode || "type",
          typeAmount: sourceItem.typeAmount || 0,
          basePrice: sourceItem.basePrice || 0,
          costPrice: sourceItem.costPrice || 0,
          makingCharge: sourceItem.makingCharge || 0,
          stoneCharge: sourceItem.stoneCharge || 0,
          profitPercent: sourceItem.profitPercent || 0,
          goldRate: sourceItem.goldRate || 0,
          status: "in-branch",
          transferredFrom: fromShop,
          transferNo: transferNo,
          createdAt: date,
        });
      }
    }

    // Save transfer log to warehouse/transfers/shopTransfers collection
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
