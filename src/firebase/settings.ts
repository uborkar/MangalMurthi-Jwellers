// src/firebase/settings.ts - Application Settings Management
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

// ============================================
// TYPES
// ============================================

export interface GSTSettings {
  cgst: number; // CGST percentage (e.g., 1.5)
  sgst: number; // SGST percentage (e.g., 1.5)
  igst: number; // IGST percentage (e.g., 3)
  defaultType: "cgst_sgst" | "igst"; // Default GST type
  updatedAt: string;
  updatedBy: string;
}

export interface AppSettings {
  gst: GSTSettings;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGSTIN?: string;
  invoicePrefix?: string;
}

// ============================================
// DEFAULT SETTINGS
// ============================================

const DEFAULT_GST_SETTINGS: GSTSettings = {
  cgst: 1.5,
  sgst: 1.5,
  igst: 3,
  defaultType: "cgst_sgst",
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  gst: DEFAULT_GST_SETTINGS,
  companyName: "Jewelry Store",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  companyGSTIN: "",
  invoicePrefix: "INV",
};

// ============================================
// SETTINGS OPERATIONS
// ============================================

/**
 * Get application settings
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const settingsRef = doc(db, "settings", "app");
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      return settingsSnap.data() as AppSettings;
    }

    // Return default settings if not found
    return DEFAULT_APP_SETTINGS;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * Update GST settings
 */
export async function updateGSTSettings(
  gstSettings: Partial<GSTSettings>,
  userId: string
): Promise<void> {
  try {
    const currentSettings = await getAppSettings();
    
    const updatedGST: GSTSettings = {
      ...currentSettings.gst,
      ...gstSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    const settingsRef = doc(db, "settings", "app");
    await setDoc(
      settingsRef,
      {
        gst: updatedGST,
      },
      { merge: true }
    );

    console.log("✅ GST settings updated");
  } catch (error) {
    console.error("Error updating GST settings:", error);
    throw error;
  }
}

/**
 * Update company settings
 */
export async function updateCompanySettings(
  companySettings: Partial<AppSettings>,
  userId: string
): Promise<void> {
  try {
    const settingsRef = doc(db, "settings", "app");
    await setDoc(settingsRef, companySettings, { merge: true });

    console.log("✅ Company settings updated");
  } catch (error) {
    console.error("Error updating company settings:", error);
    throw error;
  }
}

/**
 * Get GST settings only
 */
export async function getGSTSettings(): Promise<GSTSettings> {
  const settings = await getAppSettings();
  return settings.gst;
}

/**
 * Calculate GST amounts
 */
export function calculateGST(
  taxableAmount: number,
  gstType: "cgst_sgst" | "igst",
  gstSettings: GSTSettings
): {
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
} {
  if (gstType === "igst") {
    const igst = (taxableAmount * gstSettings.igst) / 100;
    return {
      cgst: 0,
      sgst: 0,
      igst,
      totalGST: igst,
    };
  } else {
    const cgst = (taxableAmount * gstSettings.cgst) / 100;
    const sgst = (taxableAmount * gstSettings.sgst) / 100;
    return {
      cgst,
      sgst,
      igst: 0,
      totalGST: cgst + sgst,
    };
  }
}
