// src/pages/WarehouseDiagnostic.tsx - Database Diagnostic Tool
import { useState } from "react";
import TASection from "../components/common/TASection";
import PageMeta from "../components/common/PageMeta";
import toast from "react-hot-toast";
import { Search, Database, AlertCircle } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

export default function WarehouseDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    const diagnosticResults: any = {
      timestamp: new Date().toISOString(),
      collections: {},
      itemsByStatus: {},
      sampleItems: [],
    };

    try {
      // Check main warehouseItems collection
      const warehouseItemsRef = collection(db, "warehouseItems");
      const warehouseItemsSnap = await getDocs(warehouseItemsRef);
      
      diagnosticResults.collections.warehouseItems = {
        count: warehouseItemsSnap.size,
        exists: warehouseItemsSnap.size > 0,
      };

      // Count by status
      const statusCounts: Record<string, number> = {};
      const sampleItems: any[] = [];
      
      warehouseItemsSnap.forEach((doc, index) => {
        const data = doc.data();
        const status = data.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        
        // Collect first 5 items as samples
        if (index < 5) {
          sampleItems.push({
            id: doc.id,
            barcode: data.barcode,
            category: data.category,
            status: data.status,
            taggedAt: data.taggedAt,
          });
        }
      });

      diagnosticResults.itemsByStatus = statusCounts;
      diagnosticResults.sampleItems = sampleItems;

      // Check old structure (if exists)
      try {
        const oldStructureRef = collection(db, "warehouse", "items", "items");
        const oldStructureSnap = await getDocs(oldStructureRef);
        diagnosticResults.collections.oldStructure = {
          count: oldStructureSnap.size,
          exists: oldStructureSnap.size > 0,
        };
      } catch (error) {
        diagnosticResults.collections.oldStructure = {
          count: 0,
          exists: false,
          error: "Collection doesn't exist or no access",
        };
      }

      // Check tagged_items (old)
      try {
        const taggedItemsRef = collection(db, "warehouse", "tagged_items", "items");
        const taggedItemsSnap = await getDocs(taggedItemsRef);
        diagnosticResults.collections.taggedItems = {
          count: taggedItemsSnap.size,
          exists: taggedItemsSnap.size > 0,
        };
      } catch (error) {
        diagnosticResults.collections.taggedItems = {
          count: 0,
          exists: false,
          error: "Collection doesn't exist or no access",
        };
      }

      setResults(diagnosticResults);
      toast.success("Diagnostic complete!");
    } catch (error: any) {
      console.error("Diagnostic error:", error);
      toast.error(`Diagnostic failed: ${error.message}`);
      diagnosticResults.error = error.message;
      setResults(diagnosticResults);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Warehouse Diagnostic"
        description="Check database structure and item counts"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🔍 Warehouse Database Diagnostic"
            subtitle="Check where your items are stored and their status"
          >
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-1">
                    📋 Diagnostic Tool
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    This tool checks your Firestore database to find where your items are stored
                    and what status they have. Use this to troubleshoot if items aren't showing
                    in Stock-In or other pages.
                  </p>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div className="mb-6">
              <button
                onClick={runDiagnostic}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Running Diagnostic...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Run Diagnostic
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-6">
                {/* Collection Counts */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Database size={20} />
                      Collection Summary
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                        <span className="font-medium">warehouseItems (Current)</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          results.collections.warehouseItems.count > 0
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}>
                          {results.collections.warehouseItems.count} items
                        </span>
                      </div>

                      {results.collections.oldStructure && (
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                          <span className="font-medium">warehouse/items/items (Old)</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            results.collections.oldStructure.count > 0
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}>
                            {results.collections.oldStructure.count} items
                          </span>
                        </div>
                      )}

                      {results.collections.taggedItems && (
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                          <span className="font-medium">warehouse/tagged_items/items (Old)</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            results.collections.taggedItems.count > 0
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}>
                            {results.collections.taggedItems.count} items
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                {Object.keys(results.itemsByStatus).length > 0 && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        📊 Items by Status
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        {Object.entries(results.itemsByStatus).map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                            <span className="font-medium capitalize">{status}</span>
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample Items */}
                {results.sampleItems.length > 0 && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        📝 Sample Items (First 5)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-white/10">
                          <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                            <th className="p-3">Barcode</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Tagged At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.sampleItems.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-200 dark:border-gray-800">
                              <td className="p-3 font-mono text-xs">{item.barcode}</td>
                              <td className="p-3">{item.category}</td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-gray-600 dark:text-gray-400">
                                {item.taggedAt ? new Date(item.taggedAt).toLocaleString() : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                    ✅ Recommendations
                  </h3>
                  <ul className="text-sm text-green-800 dark:text-green-300 space-y-1">
                    {results.collections.warehouseItems.count > 0 ? (
                      <>
                        <li>• Your items are in the correct collection (warehouseItems)</li>
                        <li>• Stock-In page should load items with status "tagged"</li>
                        <li>• If items don't show, check browser console for errors</li>
                      </>
                    ) : (
                      <>
                        <li>• No items found in warehouseItems collection</li>
                        <li>• Create items in Tagging page first</li>
                        {(results.collections.oldStructure?.count > 0 || results.collections.taggedItems?.count > 0) && (
                          <li>• You have items in old structure - migration needed</li>
                        )}
                      </>
                    )}
                  </ul>
                </div>

                {/* Raw Data */}
                <details className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                  <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5">
                    🔧 Raw Diagnostic Data (for debugging)
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
