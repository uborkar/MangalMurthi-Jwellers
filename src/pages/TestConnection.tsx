import React, { useEffect } from "react";
import { db } from "../firebase/config";
import { collection, addDoc, getDocs } from "firebase/firestore";

export default function TestConnection() {
  useEffect(() => {
    async function test() {
      await addDoc(collection(db, "test"), { message: "Hello Firestore" });
      
      const snap = await getDocs(collection(db, "test"));
      snap.forEach(doc => console.log("🔥", doc.data()));
    }
    test();
  }, []);

  return <div>Firestore Test Running… Check console</div>;
}
