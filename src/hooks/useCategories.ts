// src/hooks/useCategories.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export interface Category {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "settings", "categories", "items"));
        const cats = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Category, "id">)
        })).filter(c => c.active);
        
        // If Firestore collection is empty or has no active categories, use fallback
        if (cats.length === 0) {
          setCategories([
            { id: "ring", name: "Ring", code: "RNG", active: true },
            { id: "necklace", name: "Necklace", code: "NCK", active: true },
            { id: "bracelet", name: "Bracelet", code: "BRC", active: true },
            { id: "earring", name: "Earring", code: "ERG", active: true },
            { id: "chain", name: "Chain", code: "CHN", active: true },
            { id: "pendant", name: "Pendant", code: "PEN", active: true },
            { id: "bangle", name: "Bangle", code: "BNG", active: true },
            { id: "anklet", name: "Anklet", code: "ANK", active: true },
          ]);
        } else {
          setCategories(cats);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        // Fallback to hardcoded if collection doesn't exist yet
        setCategories([
          { id: "ring", name: "Ring", code: "RNG", active: true },
          { id: "necklace", name: "Necklace", code: "NCK", active: true },
          { id: "bracelet", name: "Bracelet", code: "BRC", active: true },
          { id: "earring", name: "Earring", code: "ERG", active: true },
          { id: "chain", name: "Chain", code: "CHN", active: true },
          { id: "pendant", name: "Pendant", code: "PEN", active: true },
          { id: "bangle", name: "Bangle", code: "BNG", active: true },
          { id: "anklet", name: "Anklet", code: "ANK", active: true },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { categories, loading };
}
