// src/hooks/useLocations.ts
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export interface Location {
  id: string;
  name: string;
  code: string;
  type?: string;
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      console.log("🔍 Loading locations from Firebase...");
      const snapshot = await getDocs(collection(db, "locations"));
      console.log("📊 Snapshot size:", snapshot.size);

      if (snapshot.empty) {
        // No locations in Firebase, use defaults
        console.log("⚠️ No locations found in Firebase, using defaults");
        setLocations([
          { id: "1", name: "Mumbai Malad", code: "MAL" },
          { id: "2", name: "Pune", code: "PUN" },
          { id: "3", name: "Sangli", code: "SAN" },
          { id: "4", name: "Nagpur", code: "NGP" },
        ]);
      } else {
        const data = snapshot.docs.map((doc) => {
          console.log("📄 Document:", doc.id, doc.data());
          return {
            id: doc.id,
            ...doc.data(),
          };
        }) as Location[];

        // Sort by name
        data.sort((a, b) => a.name.localeCompare(b.name));

        console.log("✅ Loaded locations:", data);
        setLocations(data);
      }

      setError(null);
    } catch (err) {
      console.error("❌ Error loading locations:", err);
      setError("Failed to load locations");

      // Fallback to default locations if Firebase fails
      setLocations([
        { id: "1", name: "Mumbai Malad", code: "MAL" },
        { id: "2", name: "Pune", code: "PUN" },
        { id: "3", name: "Sangli", code: "SAN" },
      ]);
    } finally {
      setLoading(false);
      console.log("🏁 Loading complete");
    }
  }

  return { locations, loading, error, reload: loadLocations };
}
