// src/pages/MigrateWarehouse.tsx - Migrate to Structured Warehouse
import { useState } from "react";
import TASection from "../components/common/TASection";
import PageMeta from "../components/common/PageMeta";
import toast from "react-hot-toast";
import { ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function MigrateWarehouse() {
    const [migrating, setMigrating] = useState(false);
    const [results, setResults] = useState<any>(null);

    const runMigration = async () => {
        const confirmMsg = `⚠️ This will migrate all items from flat warehouseItems to structured subcollections.\n\nAre you sure?`;
        if (!window.confirm(confirmMsg)) return;

        setMigrating(true);
        const migrationResults: any = {
            timestamp: new Date().toISOString(),
            steps: [],
        };

        try {
            // Step 1: Read all items from flat collection
            migrationResults.steps.push({ name: "Reading items", status: "running" });

            const flatItems = await getDocs(collection(db, "warehouseItems"));
            migrationResults.steps[0].status = "success";
            migrationResults.steps[0].count = flatItems.size;
            toast.success(`Found ${flatItems.size} items to migrate`);

            // Step 2: Categorize items by status
            migrationResults.steps.push({ name: "Categorizing items", status: "running" });

            const categorized: Record<string, any[]> = {
                tagged: [],
                printed: [],
                stocked: [],
                distributed: [],
                unknown: [],
            };

            flatItems.forEach((docSnap) => {
                const data = docSnap.data();
                const status = data.status || "unknown";

                const item = {
                    label: data.barcode,
                    barcodeValue: data.barcode,
                    serial: data.serial,
                    category: data.category,
                    subcategory: data.subcategory || "",
                    categoryCode: data.categoryCode,
                    location: data.location,
                    locationCode: data.locationCode,
                    weight: data.weight || "",
                    price: data.costPrice || 0,
                    costPriceType: data.costPriceType || "",
                    remark: data.remark || "",
                    year: data.year,
                    printed: status === "printed",
                    printedAt: data.printedAt || null,
                    stockedAt: data.stockedAt || null,
                    distributedAt: data.distributedAt || null,
                    distributedTo: data.distributedTo || null,
                    createdAt: data.createdAt || data.taggedAt || new Date().toISOString(),
                };

                if (status === "tagged") {
                    categorized.tagged.push(item);
                } else if (status === "printed") {
                    categorized.printed.push(item);
                } else if (status === "stocked") {
                    categorized.stocked.push(item);
                } else if (status === "distributed") {
                    categorized.distributed.push(item);
                } else {
                    // Default unknown to tagged
                    categorized.tagged.push(item);
                }
            });

            migrationResults.steps[1].status = "success";
            migrationResults.steps[1].categorized = {
                tagged: categorized.tagged.length,
                printed: categorized.printed.length,
                stocked: categorized.stocked.length,
                distributed: categorized.distributed.length,
                unknown: categorized.unknown.length,
            };
            toast.success("Items categorized");

            // Step 3: Write to structured collections
            migrationResults.steps.push({ name: "Writing to new structure", status: "running" });

            const batch = writeBatch(db);
            let writeCount = 0;

            // Write tagged items
            categorized.tagged.forEach((item) => {
                const ref = doc(collection(db, "warehouseItems", "tagged", "items"));
                batch.set(ref, item);
                writeCount++;
            });

            // Write printed items
            categorized.printed.forEach((item) => {
                const ref = doc(collection(db, "warehouseItems", "printed", "items"));
                batch.set(ref, item);
                writeCount++;
            });

            // Write stocked items
            categorized.stocked.forEach((item) => {
                const ref = doc(collection(db, "warehouseItems", "stocked", "items"));
                batch.set(ref, item);
                writeCount++;
            });

            // Write distributed items
            categorized.distributed.forEach((item) => {
                const ref = doc(collection(db, "warehouseItems", "distributed", "items"));
                batch.set(ref, item);
                writeCount++;
            });

            await batch.commit();
            migrationResults.steps[2].status = "success";
            migrationResults.steps[2].written = writeCount;
            toast.success(`Wrote ${writeCount} items to new structure`);

            // Step 4: Verify migration
            migrationResults.steps.push({ name: "Verifying migration", status: "running" });

            const [taggedSnap, printedSnap, stockedSnap, distributedSnap] = await Promise.all([
                getDocs(collection(db, "warehouseItems", "tagged", "items")),
                getDocs(collection(db, "warehouseItems", "printed", "items")),
                getDocs(collection(db, "warehouseItems", "stocked", "items")),
                getDocs(collection(db, "warehouseItems", "distributed", "items")),
            ]);

            const newTotal = taggedSnap.size + printedSnap.size + stockedSnap.size + distributedSnap.size;

            migrationResults.steps[3].status = "success";
            migrationResults.steps[3].verification = {
                tagged: taggedSnap.size,
                printed: printedSnap.size,
                stocked: stockedSnap.size,
                distributed: distributedSnap.size,
                total: newTotal,
            };

            if (newTotal === flatItems.size) {
                toast.success("✅ Migration verified! All items migrated successfully");
            } else {
                toast.error(`⚠️ Count mismatch! Original: ${flatItems.size}, New: ${newTotal}`);
            }

            setResults(migrationResults);
        } catch (error: any) {
            console.error("Migration error:", error);
            migrationResults.error = error.message;
            migrationResults.steps[migrationResults.steps.length - 1].status = "error";
            migrationResults.steps[migrationResults.steps.length - 1].error = error.message;
            setResults(migrationResults);
            toast.error(`Migration failed: ${error.message}`);
        } finally {
            setMigrating(false);
        }
    };

    const deleteOldCollection = async () => {
        const confirmMsg = `⚠️⚠️⚠️ DANGER ⚠️⚠️⚠️\n\nThis will PERMANENTLY DELETE the old warehouseItems collection!\n\nOnly do this AFTER verifying the migration worked!\n\nType "DELETE" to confirm:`;
        const userInput = window.prompt(confirmMsg);

        if (userInput !== "DELETE") {
            toast.error("Deletion cancelled");
            return;
        }

        setMigrating(true);
        try {
            const flatItems = await getDocs(collection(db, "warehouseItems"));
            const batch = writeBatch(db);

            flatItems.forEach((docSnap) => {
                batch.delete(docSnap.ref);
            });

            await batch.commit();
            toast.success(`✅ Deleted ${flatItems.size} items from old collection`);
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(`Failed to delete: ${error.message}`);
        } finally {
            setMigrating(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Migrate Warehouse"
                description="Migrate to structured warehouse subcollections"
            />

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    <TASection
                        title="🔄 Warehouse Migration Tool"
                        subtitle="Migrate from flat to structured subcollections"
                    >
                        {/* Warning */}
                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={24} />
                                <div>
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">
                                        ⚠️ Important Information
                                    </h3>
                                    <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                                        This will migrate your items from:
                                    </p>
                                    <div className="text-sm text-amber-800 dark:text-amber-300 font-mono bg-amber-100 dark:bg-amber-900/40 p-2 rounded mb-2">
                                        warehouseItems/{"{itemId}"} (FLAT)
                                    </div>
                                    <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">To:</p>
                                    <div className="text-sm text-amber-800 dark:text-amber-300 font-mono bg-amber-100 dark:bg-amber-900/40 p-2 rounded">
                                        warehouseItems/tagged/items/{"{itemId}"}
                                        <br />
                                        warehouseItems/printed/items/{"{itemId}"}
                                        <br />
                                        warehouseItems/stocked/items/{"{itemId}"}
                                        <br />
                                        warehouseItems/distributed/items/{"{itemId}"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={runMigration}
                                disabled={migrating}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {migrating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Migrating...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight size={20} />
                                        Run Migration
                                    </>
                                )}
                            </button>

                            {results && results.steps[3]?.status === "success" && (
                                <button
                                    onClick={deleteOldCollection}
                                    disabled={migrating}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <AlertTriangle size={20} />
                                    Delete Old Collection
                                </button>
                            )}
                        </div>

                        {/* Results */}
                        {results && (
                            <div className="space-y-4">
                                {results.steps.map((step: any, index: number) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-xl border ${step.status === "success"
                                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                            : step.status === "error"
                                                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {step.status === "success" ? (
                                                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                                            ) : (
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{step.name}</h3>
                                                {step.count !== undefined && (
                                                    <p className="text-sm mt-1">Items found: {step.count}</p>
                                                )}
                                                {step.categorized && (
                                                    <div className="text-sm mt-2 space-y-1">
                                                        <p>Tagged: {step.categorized.tagged}</p>
                                                        <p>Printed: {step.categorized.printed}</p>
                                                        <p>Stocked: {step.categorized.stocked}</p>
                                                        <p>Distributed: {step.categorized.distributed}</p>
                                                    </div>
                                                )}
                                                {step.written !== undefined && (
                                                    <p className="text-sm mt-1">Items written: {step.written}</p>
                                                )}
                                                {step.verification && (
                                                    <div className="text-sm mt-2 space-y-1">
                                                        <p className="font-semibold">Verification:</p>
                                                        <p>Tagged: {step.verification.tagged}</p>
                                                        <p>Printed: {step.verification.printed}</p>
                                                        <p>Stocked: {step.verification.stocked}</p>
                                                        <p>Distributed: {step.verification.distributed}</p>
                                                        <p className="font-bold">Total: {step.verification.total}</p>
                                                    </div>
                                                )}
                                                {step.error && (
                                                    <p className="text-sm mt-1 text-red-600 dark:text-red-400">
                                                        Error: {step.error}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Raw Data */}
                                <details className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                                    <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5">
                                        🔧 Raw Migration Data
                                    </summary>
                                    <div className="p-4 bg-gray-50 dark:bg-white/5">
                                        <pre className="text-xs overflow-auto p-4 bg-gray-900 text-green-400 rounded-lg">
                                            {JSON.stringify(results, null, 2)}
                                        </pre>
                                    </div>
                                </details>
                            </div>
                        )}
                    </TASection>
                </div>
            </div>
        </>
    );
}
