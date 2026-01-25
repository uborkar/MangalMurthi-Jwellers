# Stock Status Migration Guide

## Purpose
This migration updates the stock status of all items in existing bookings from "in-branch" to "booked".

## How to Run (Option 1 - Browser Console)

1. **Open your application** in the browser
2. **Login** to your account
3. **Open Browser Console** (Press F12 or Right-click → Inspect → Console tab)
4. **Run the migration** by typing:
   ```javascript
   window.runMigration()
   ```
5. **Press Enter** and wait for completion
6. **Check the console output** - you'll see detailed logs like:
   ```
   🚀 Starting migration: Update stock status for booked items...
   📍 Processing branch: Miraj
      Found 5 bookings
      Processing booking: MIR-021834 (2 items)
         ✅ Updated: ABC123 (Ring)
         ✅ Updated: XYZ789 (Necklace)
   ...
   📊 MIGRATION SUMMARY
   ====================================
   Total Branches Processed: 4
   Total Bookings Found: 15
   Total Items Processed: 30
   Total Items Updated: 28
   Total Items Not Found: 2
   ====================================
   ✅ Migration completed!
   ```

## What the Migration Does

1. **Scans all branches**: Miraj, Sangli, Ichalkaranji, Tasgaon
2. **Finds all bookings** in each branch
3. **For each item in each booking**:
   - Looks up the item in branch stock by barcode
   - If found and status is "in-branch":
     - Updates status to "booked"
     - Adds `bookedBy` field (booking ID)
     - Adds `bookedAt` field (timestamp)
   - If already "booked" or "sold": Skips it
   - If not found: Logs a warning

## Safety Features

- ✅ **Non-destructive**: Only updates items that are currently "in-branch"
- ✅ **Skips already processed items**: Won't overwrite "sold" or already "booked" items
- ✅ **Error handling**: Continues even if individual items fail
- ✅ **Detailed logging**: Shows exactly what was updated
- ✅ **No UI changes**: Runs entirely in the background

## After Migration

1. **Refresh the Branch Stock page** to see updated statuses
2. **Try scanning a booked item** - it should be rejected with "Item is not available (status: booked)"
3. **Check the console** for any warnings about items not found

## Troubleshooting

**If migration doesn't run:**
- Make sure you're logged in
- Refresh the page and try again
- Check console for any error messages

**If some items aren't updated:**
- Check the console logs for "Not found in stock" warnings
- These items might have been deleted or have incorrect barcodes

## Important Notes

- ⚠️ **Run this ONCE only** - Running multiple times won't cause issues but is unnecessary
- ⚠️ **Backup recommended** - Though safe, it's good practice to backup your Firebase data first
- ✅ **Can be run anytime** - Safe to run even with active users

## After Running

Once the migration is complete and verified, you can remove the migration code:
1. Remove the import from `App.tsx`
2. Delete the `src/utils/migrateBookedItems.ts` file
3. Delete the `scripts/migrate-booked-items-status.js` file
