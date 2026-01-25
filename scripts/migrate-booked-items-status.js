// Migration Script: Update Stock Status for All Existing Bookings
// Run this once to update the status of all items in existing bookings to "booked"
// This script should be run from Node.js or Firebase Functions, NOT from the frontend

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BRANCHES = ["Miraj", "Sangli", "Ichalkaranji", "Tasgaon"];

async function migrateBookedItemsStatus() {
  console.log("🚀 Starting migration: Update stock status for booked items...");
  
  let totalBookings = 0;
  let totalItemsProcessed = 0;
  let totalItemsUpdated = 0;
  let totalItemsNotFound = 0;

  for (const branch of BRANCHES) {
    console.log(`\n📍 Processing branch: ${branch}`);
    
    try {
      // Get all bookings for this branch
      const bookingsRef = collection(db, "shops", branch, "bookings");
      const bookingsSnapshot = await getDocs(bookingsRef);
      
      console.log(`   Found ${bookingsSnapshot.size} bookings`);
      totalBookings += bookingsSnapshot.size;

      for (const bookingDoc of bookingsSnapshot.docs) {
        const bookingData = bookingDoc.data();
        const bookingId = bookingDoc.id;
        const items = bookingData.items || [];

        console.log(`   Processing booking: ${bookingData.bookingNo || bookingId} (${items.length} items)`);

        for (const item of items) {
          totalItemsProcessed++;
          
          try {
            let stockDocId = null;

            // Try to find stock item by barcode
            if (item.barcode) {
              const stockQuery = query(
                collection(db, "shops", branch, "stock"),
                where("barcode", "==", item.barcode)
              );
              const stockSnapshot = await getDocs(stockQuery);
              
              if (!stockSnapshot.empty) {
                stockDocId = stockSnapshot.docs[0].id;
                const currentStatus = stockSnapshot.docs[0].data().status;
                
                // Only update if not already booked or sold
                if (currentStatus === "in-branch") {
                  const stockRef = doc(db, "shops", branch, "stock", stockDocId);
                  await setDoc(stockRef, {
                    status: "booked",
                    bookedBy: bookingId,
                    bookedAt: bookingData.createdAt || new Date().toISOString(),
                  }, { merge: true });
                  
                  totalItemsUpdated++;
                  console.log(`      ✅ Updated: ${item.barcode} (${item.category || item.itemName})`);
                } else {
                  console.log(`      ⏭️  Skipped: ${item.barcode} (already ${currentStatus})`);
                }
              } else {
                totalItemsNotFound++;
                console.log(`      ⚠️  Not found in stock: ${item.barcode}`);
              }
            } else {
              console.log(`      ⚠️  No barcode for item: ${item.category || item.itemName}`);
            }
          } catch (itemError) {
            console.error(`      ❌ Error processing item ${item.barcode}:`, itemError.message);
          }
        }
      }
    } catch (branchError) {
      console.error(`❌ Error processing branch ${branch}:`, branchError.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Branches Processed: ${BRANCHES.length}`);
  console.log(`Total Bookings Found: ${totalBookings}`);
  console.log(`Total Items Processed: ${totalItemsProcessed}`);
  console.log(`Total Items Updated: ${totalItemsUpdated}`);
  console.log(`Total Items Not Found: ${totalItemsNotFound}`);
  console.log(`Total Items Skipped: ${totalItemsProcessed - totalItemsUpdated - totalItemsNotFound}`);
  console.log("=".repeat(60));
  console.log("✅ Migration completed!");
}

// Run the migration
migrateBookedItemsStatus()
  .then(() => {
    console.log("\n✅ Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
