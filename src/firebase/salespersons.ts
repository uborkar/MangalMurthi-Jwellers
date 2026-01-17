// Firebase Salesperson Management - Dynamic add/delete
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./config";
import toast from "react-hot-toast";

export interface Salesperson {
    id: string;
    name: string;
    primaryBranch: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

const COLLECTION_NAME = "salespersons";

// Get all active salespersons
export const getAllActiveSalespersons = async (): Promise<Salesperson[]> => {
    try {
        // Fetch all salespersons where active is true
        // Then sort in JavaScript to avoid compound index requirement
        const q = query(
            collection(db, COLLECTION_NAME),
            where("active", "==", true)
        );
        const snapshot = await getDocs(q);
        const salespersons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salesperson));

        // Sort by name in JavaScript
        return salespersons.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching salespersons:", error);
        return [];
    }
};

// Add a new salesperson
export const addSalesperson = async (name: string, primaryBranch: string): Promise<boolean> => {
    try {
        // Check if name already exists
        const existing = await getAllActiveSalespersons();
        const duplicate = existing.find(sp => sp.name.toLowerCase() === name.toLowerCase());

        if (duplicate) {
            toast.error("Salesperson with this name already exists");
            return false;
        }

        const id = name.toLowerCase().replace(/\s+/g, "_");
        const docRef = doc(db, COLLECTION_NAME, id);

        await setDoc(docRef, {
            name: name.trim(),
            primaryBranch,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        toast.success(`Added salesperson: ${name}`);
        return true;
    } catch (error) {
        console.error("Error adding salesperson:", error);
        toast.error("Failed to add salesperson");
        return false;
    }
};

// Delete a salesperson (soft delete - mark as inactive)
export const deleteSalesperson = async (id: string, name: string): Promise<boolean> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);

        // Soft delete by marking as inactive
        await setDoc(docRef, {
            active: false,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        toast.success(`Removed salesperson: ${name}`);
        return true;
    } catch (error) {
        console.error("Error deleting salesperson:", error);
        toast.error("Failed to remove salesperson");
        return false;
    }
};

// Initialize default salespersons (one-time setup)
export const initializeDefaultSalespersons = async (): Promise<void> => {
    const defaultSalespersons = [
        { name: "Rajesh Kumar", primaryBranch: "Sangli" },
        { name: "Priya Sharma", primaryBranch: "Sangli" },
        { name: "Amit Patil", primaryBranch: "Sangli" },
        { name: "Suresh Desai", primaryBranch: "Miraj" },
        { name: "Sneha Joshi", primaryBranch: "Miraj" },
        { name: "Vikram More", primaryBranch: "Miraj" },
        { name: "Ganesh Kulkarni", primaryBranch: "Kolhapur" },
        { name: "Pooja Rane", primaryBranch: "Kolhapur" },
        { name: "Rahul Pawar", primaryBranch: "Kolhapur" },
        { name: "Kiran Shah", primaryBranch: "Mumbai" },
        { name: "Neha Gupta", primaryBranch: "Mumbai" },
        { name: "Anil Mehta", primaryBranch: "Mumbai" },
        { name: "Sachin Bhosale", primaryBranch: "Pune" },
        { name: "Kavita Deshpande", primaryBranch: "Pune" },
        { name: "Manoj Shinde", primaryBranch: "Pune" },
    ];

    try {
        for (const sp of defaultSalespersons) {
            const id = sp.name.toLowerCase().replace(/\s+/g, "_");
            const docRef = doc(db, COLLECTION_NAME, id);

            await setDoc(docRef, {
                name: sp.name,
                primaryBranch: sp.primaryBranch,
                active: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true }); // Use merge to avoid overwriting existing data
        }

        toast.success("Salespersons initialized");
    } catch (error) {
        console.error("Error initializing salespersons:", error);
        toast.error("Failed to initialize salespersons");
    }
};
