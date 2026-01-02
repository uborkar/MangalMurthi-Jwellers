// src/pages/TestFirestore.tsx - Test Firestore Connection
import { useState } from "react";
import TASection from "../components/common/TASection";
import PageMeta from "../components/common/PageMeta";
import toast from "react-hot-toast";
import { Database, CheckCircle, XCircle } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function TestFirestore() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setTesting(true);
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: [],
    };

    try {
      // Test 1: Write to warehouseItems
      testResults.tests.push({ name: "Write Test", status: "running" });
      
      const testItem = {
        barcode: `TEST-${Date.now()}`,
        serial: 999,
        category: "Test",
        subcategory: "Test",
        categoryCode: "TST",
        location: "Test Location",
        locationCode: "TST",
        weight: "1.0",
        costPrice: 100,
        costPriceType: "TEST",
        remark: "Test Item",
        year: 2025,
        status: "tagged",
        taggedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "warehouseItems"), testItem);
      testResults.tests[0].status = "success";
      testResults.tests[0].docId = docRef.id;
      toast.success("✅ Write test passed!");

      // Test 2: Read from warehouseItems
      testResults.tests.push({ name: "Read Test", status: "running" });
      
      const snapshot = await getDocs(collection(db, "warehouseItems"));
      testResults.tests[1].status = "success";
      testResults.tests[1].count = snapshot.size;
      testResults.tests[1].items = snapshot.docs.slice(0, 5).map(d => ({
        id: d.id,
        barcode: d.data().barcode,
        category: d.data().category,
        status: d.data().status,
      }));
      toast.success(`✅ Read test passed! Found ${snapshot.size} items`);

      // Test 3: Delete test item
      testResults.tests.push({ name: "Delete Test", status: "running" });
      
      await deleteDoc(doc(db, "warehouseItems", docRef.id));
      testResults.tests[2].status = "success";
      toast.success("✅ Delete test passed!");

      // Test 4: Check old structure
      testResults.tests.push({ name: "Check Old Structure", status: "running" });
      
      try {
        const oldSnapshot = await getDocs(
          collection(db, "warehouse", "tagged_items", "items")
        );
        testResults.tests[3].status = "success";
        testResults.tests[3].count = oldSnapshot.size;
        testResults.tests[3].message = oldSnapshot.size > 0 
          ? `Found ${oldSnapshot.size} items in old structure`
          : "Old structure is empty";
      } catch (error: any) {
        testResults.tests[3].status = "error";
        testResults.tests[3].error = error.message;
      }

      setResults(testResults);
      toast.success("🎉 All tests completed!");
    } catch (error: any) {
      console.error("Test error:", error);
      testResults.error = error.message;
      testResults.tests[testResults.tests.length - 1].status = "error";
      testResults.tests[testResults.tests.length - 1].error = error.message;
      setResults(testResults);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Firestore Test"
        description="Test Firestore read/write operations"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🔥 Firestore Connection Test"
            subtitle="Test database read/write operations"
          >
            {/* Info */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                This test will:
                <br />
                1. Write a test item to warehouseItems collection
                <br />
                2. Read all items from warehouseItems
                <br />
                3. Delete the test item
                <br />
                4. Check if old structure exists
              </p>
            </div>

            {/* Run Button */}
            <div className="mb-6">
              <button
                onClick={runTest}
                disabled={testing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Database size={20} />
                    Run Tests
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-4">
                {results.tests.map((test: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      test.status === "success"
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : test.status === "error"
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {test.status === "success" ? (
                        <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                      ) : test.status === "error" ? (
                        <XCircle className="text-red-600 dark:text-red-400" size={24} />
                      ) : (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{test.name}</h3>
                        {test.count !== undefined && (
                          <p className="text-sm mt-1">Items found: {test.count}</p>
                        )}
                        {test.docId && (
                          <p className="text-sm mt-1 font-mono text-xs">Doc ID: {test.docId}</p>
                        )}
                        {test.message && (
                          <p className="text-sm mt-1">{test.message}</p>
                        )}
                        {test.error && (
                          <p className="text-sm mt-1 text-red-600 dark:text-red-400">
                            Error: {test.error}
                          </p>
                        )}
                        {test.items && test.items.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-sm cursor-pointer">
                              Sample items ({test.items.length})
                            </summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-900 text-green-400 rounded overflow-auto">
                              {JSON.stringify(test.items, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {results.error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2">
                      ❌ Test Failed
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">{results.error}</p>
                  </div>
                )}

                {/* Raw Data */}
                <details className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
                  <summary className="p-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5">
                    🔧 Raw Test Data
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
