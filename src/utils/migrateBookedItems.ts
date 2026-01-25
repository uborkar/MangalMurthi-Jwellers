// Migration Script: Update Stock Status for All Existing Bookings
// This is a TypeScript version that uses your existing Firebase config
// Run this ONCE from the browser console on your app

import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

const BRANCHES = ["Miraj", "Sangli", "Ichalkaranji", "Tasgaon"];

export async function migrateBookedItemsStatus() {
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
                    } catch (itemError: any) {
                        console.error(`      ❌ Error processing item ${item.barcode}:`, itemError.message);
                    }
                }
            }
        } catch (branchError: any) {
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

    return {
        totalBookings,
        totalItemsProcessed,
        totalItemsUpdated,
        totalItemsNotFound
    };
}

// To run this migration:
// 1. Open your app in the browser
// 2. Open browser console (F12)
// 3. Type: window.runMigration()
// 4. Press Enter

if (typeof window !== 'undefined') {
    (window as any).runMigration = migrateBookedItemsStatus;
    console.log("✅ Migration script loaded. Run 'window.runMigration()' in console to start.");
}
