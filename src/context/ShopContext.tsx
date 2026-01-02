// src/context/ShopContext.tsx - Shop State Management
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BranchStockItem } from "../firebase/shopStock";

type BranchName = "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";

interface BillItem {
  id: string;
  barcode: string;
  category: string;
  subcategory?: string;
  location: string; // Location (Loct)
  type: string;
  weight: string;
  costPrice: number;
  sellingPrice: number;
  discount: number;
  taxableAmount: number;
  shopStockId?: string;
  warehouseItemId?: string;
}

interface ShopContextType {
  // Branch Stock Cache
  branchStockCache: Record<BranchName, BranchStockItem[]>;
  setBranchStockCache: (branch: BranchName, stock: BranchStockItem[]) => void;
  
  // Billing State
  currentBill: {
    branch: BranchName;
    items: BillItem[];
    customerName: string;
    customerPhone: string;
    salespersonName: string;
  };
  updateBill: (updates: Partial<ShopContextType['currentBill']>) => void;
  clearBill: () => void;
  
  // Loading States
  loadingStates: Record<string, boolean>;
  setLoadingState: (key: string, loading: boolean) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const STORAGE_KEY = "shop_context_data";

export function ShopProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage
  const [branchStockCache, setBranchStockCacheState] = useState<Record<BranchName, BranchStockItem[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return data.branchStockCache || {};
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
    return {};
  });

  const [currentBill, setCurrentBill] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return data.currentBill || {
          branch: "Sangli" as BranchName,
          items: [],
          customerName: "",
          customerPhone: "",
          salespersonName: "",
        };
      }
    } catch (error) {
      console.error("Error loading bill from localStorage:", error);
    }
    return {
      branch: "Sangli" as BranchName,
      items: [],
      customerName: "",
      customerPhone: "",
      salespersonName: "",
    };
  });

  const [loadingStates, setLoadingStatesState] = useState<Record<string, boolean>>({});

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      const dataToSave = {
        branchStockCache,
        currentBill,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [branchStockCache, currentBill]);

  const setBranchStockCache = (branch: BranchName, stock: BranchStockItem[]) => {
    setBranchStockCacheState((prev) => ({
      ...prev,
      [branch]: stock,
    }));
  };

  const updateBill = (updates: Partial<ShopContextType['currentBill']>) => {
    setCurrentBill((prev: ShopContextType['currentBill']) => ({
      ...prev,
      ...updates,
    }));
  };

  const clearBill = () => {
    setCurrentBill({
      branch: currentBill.branch,
      items: [],
      customerName: "",
      customerPhone: "",
      salespersonName: "",
    });
  };

  const setLoadingState = (key: string, loading: boolean) => {
    setLoadingStatesState((prev) => ({
      ...prev,
      [key]: loading,
    }));
  };

  return (
    <ShopContext.Provider
      value={{
        branchStockCache,
        setBranchStockCache,
        currentBill,
        updateBill,
        clearBill,
        loadingStates,
        setLoadingState,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
