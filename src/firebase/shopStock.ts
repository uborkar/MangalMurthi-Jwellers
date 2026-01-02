import { db } from "./config";
import { collection, getDocs } from "firebase/firestore";

export interface BranchStockItem {
  id?: string;
  serial?: number; // Branch-specific serial (1, 2, 3...)
  warehouseSerial?: number; // Original warehouse serial for reference
  label: string;
  barcode: string;
  productName?: string;
  remark?: string;
  category?: string;
  subcategory?: string;
  costPriceType?: string;
  type?: string;
  design?: string;
  weight?: string | number;
  weightG?: number;

  pricingMode?: "weight" | "type";
  typeAmount?: number;
  basePrice?: number;
  costPrice?: number;
  makingCharge?: number;
  stoneCharge?: number;
  profitPercent?: number;
  goldRate?: number;
  status?: "in-branch" | "reserved" | "sold" | "returned";
  price?: number;

  warehouseItemId?: string;
  location?: string;
  createdAt?: string;
  transferredAt?: string;
  transferredFrom?: string;
}

export async function getShopStock(shop: string): Promise<BranchStockItem[]> {
  const ref = collection(db, "shops", shop, "stockItems");
  const snap = await getDocs(ref);

  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as BranchStockItem)
  }));
}
