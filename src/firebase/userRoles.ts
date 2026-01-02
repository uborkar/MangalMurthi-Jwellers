// src/firebase/userRoles.ts - User Role Management
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

export type UserRole = "admin" | "manager" | "warehouse" | "shop";

export interface UserProfile {
  email: string;
  role: UserRole;
  displayName?: string;
  branch?: string; // For shop users
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

// Get user role from Firestore
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      return data.role || "warehouse"; // Default to warehouse if no role
    }
    return "warehouse"; // Default role
  } catch (error) {
    console.error("Error getting user role:", error);
    return "warehouse";
  }
}

// Get full user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

// Create or update user profile
export async function setUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const existingDoc = await getDoc(userRef);
    
    const data: UserProfile = {
      email: profile.email || "",
      role: profile.role || "warehouse",
      displayName: profile.displayName,
      branch: profile.branch,
      permissions: profile.permissions || [],
      createdAt: existingDoc.exists() ? existingDoc.data().createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    console.error("Error setting user profile:", error);
    throw error;
  }
}

// Role-based permissions
export const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    "warehouse:all",
    "shops:all",
    "reports:all",
    "users:manage",
    "settings:manage",
  ],
  manager: [
    "warehouse:view",
    "warehouse:reports",
    "shops:all",
    "reports:all",
  ],
  warehouse: [
    "warehouse:tagging",
    "warehouse:stock-in",
    "warehouse:distribution",
    "warehouse:returns",
    "warehouse:reports",
  ],
  shop: [
    "shops:branch-stock",
    "shops:billing",
    "shops:sale-booking",
    "shops:sales-report",
    "shops:sales-return",
    "shops:shop-expense",
  ],
};

// Check if user has permission
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = rolePermissions[userRole];
  return permissions.some(p => 
    p === permission || 
    p.endsWith(":all") && permission.startsWith(p.split(":")[0])
  );
}
