// pages/firebase-test.js
import React, { useEffect } from "react";
import { db, storage } from "../utils/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadString } from "firebase/storage";

export default function FirebaseTest() {
  useEffect(() => {
    const runTest = async () => {
      try {
        // 1. Voeg testdocument toe aan Firestore
        await addDoc(collection(db, "test"), {
          message: "✅ Firestore werkt!",
          timestamp: new Date().toISOString(),
        });

        // 2. Upload tekstbestand naar Firebase Storage
        const storageRef = ref(storage, "test/hello.txt");
        await uploadString(storageRef, "✅ Firebase Storage werkt!");

        alert("✅ Verbinding met Firestore en Storage is gelukt!");
      } catch (error) {
        console.error("❌ Firebase test mislukt:", error);
        alert("❌ Firebase test mislukt. Check console.");
      }
    };

    runTest();
  }, []);

  return (
    <div style={{ padding: "2rem", color: "#fff", backgroundColor: "#222" }}>
      <h1>🔥 Firebase Testpagina</h1>
      <p>Als alles werkt, zie je een alert én Firebase entries verschijnen.</p>
    </div>
  );
}