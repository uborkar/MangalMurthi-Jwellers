import { db } from "./config";
import { collection, getDocs } from "firebase/firestore";

export interface BranchStockItem {
  id?: string;
  label: string;
  productName?: string;
  category?: string;
  weight?: string | number;
  weightG?: number;
  purity?: string;

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

  createdAt?: string;
  transferredAt?: string;
}

export async function getShopStock(shop: string): Promise<BranchStockItem[]> {
  const ref = collection(db, "shops", shop, "stockItems");
  const snap = await getDocs(ref);

  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as BranchStockItem)
  }));
}
