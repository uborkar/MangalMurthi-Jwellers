// src/pages/Warehouse/ReturnedItems.tsx - Warehouse Returned Items Management
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Package, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  getWarehouseReturns,
  updateWarehouseReturnStatus,
  WarehouseReturnItem,
} from "../../firebase/salesReturns";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function ReturnedItems() {
  const [returns, setReturns] = useState<WarehouseReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending-warehouse" | "received-warehouse" | "restocked">("all");

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const data = await getWarehouseReturns();
      setReturns(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      toast.success(`Loaded ${data.length} returned items`);
    } catch (error) {
      console.error("Error loading returns:", error);
      toast.error("Failed to load returned items");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: WarehouseReturnItem["status"]) => {
    try {
      await updateWarehouseReturnStatus(id, status);
      
      // If restocked, update warehouse item status
      if (status === "restocked") {
        const returnItem = returns.find(r => r.id === id);
        if (returnItem) {
          try {
            const warehouseItemRef = doc(db, "warehouseItems", returnItem.barcode);
            await updateDoc(warehouseItemRef, {
              status: "stocked",
              restoredAt: new Date().toISOString(),
            });
          } catch (err) {
            console.log("Warehouse item update skipped:", err);
          }
        }
      }
      
      toast.success(`Status updated to ${status}`);
      await loadReturns();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredReturns = filter === "all" 
    ? returns 
    : returns.filter(r => r.status === filter);

  const getStatusBadge = (status: WarehouseReturnItem["status"]) => {
    switch (status) {
      case "pending-warehouse":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">Pending</span>;
      case "received-warehouse":
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">Received</span>;
      case "restocked":
        return <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">Restocked</span>;
    }
  };

  return (
    <>
      <PageMeta title="Warehouse Returned Items" description="Manage items returned from shops" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📦 Warehouse Returned Items"
            subtitle="Manage items returned from shops to warehouse"
          >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                  <Package className="text-gray-600 dark:text-gray-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Returns</span>
                <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">{returns.length}</h4>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-800 dark:bg-yellow-900/20">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-xl dark:bg-yellow-900/30 mb-3">
                  <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
                <h4 className="mt-2 font-bold text-yellow-600 text-2xl dark:text-yellow-400">
                  {returns.filter(r => r.status === "pending-warehouse").length}
                </h4>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl dark:bg-blue-900/30 mb-3">
                  <CheckCircle className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Received</span>
                <h4 className="mt-2 font-bold text-blue-600 text-2xl dark:text-blue-400">
                  {returns.filter(r => r.status === "received-warehouse").length}
                </h4>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl dark:bg-green-900/30 mb-3">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Restocked</span>
                <h4 className="mt-2 font-bold text-green-600 text-2xl dark:text-green-400">
                  {returns.filter(r => r.status === "restocked").length}
                </h4>
              </div>
            </div>

            {/* Filter */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                All ({returns.length})
              </button>
              <button
                onClick={() => setFilter("pending-warehouse")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "pending-warehouse"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                Pending ({returns.filter(r => r.status === "pending-warehouse").length})
              </button>
              <button
                onClick={() => setFilter("received-warehouse")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "received-warehouse"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                Received ({returns.filter(r => r.status === "received-warehouse").length})
              </button>
              <button
                onClick={() => setFilter("restocked")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "restocked"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                Restocked ({returns.filter(r => r.status === "restocked").length})
              </button>
            </div>

            {/* Returns Table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                    <th className="p-3">Return ID</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Barcode</th>
                    <th className="p-3">From Branch</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Return Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="p-3 font-mono text-xs">{item.returnId}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-semibold">{item.category}</p>
                          <p className="text-xs text-gray-500">{item.subcategory}</p>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs">{item.barcode}</td>
                      <td className="p-3">{item.branch}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{item.returnReason}</p>
                          {item.remarks && <p className="text-xs text-gray-500">{item.remarks}</p>}
                        </div>
                      </td>
                      <td className="p-3">{new Date(item.returnDate).toLocaleDateString()}</td>
                      <td className="p-3">{getStatusBadge(item.status)}</td>
                      <td className="p-3">
                        {item.status === "pending-warehouse" && (
                          <button
                            onClick={() => handleStatusUpdate(item.id!, "received-warehouse")}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                          >
                            Mark Received
                          </button>
                        )}
                        {item.status === "received-warehouse" && (
                          <button
                            onClick={() => handleStatusUpdate(item.id!, "restocked")}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
                          >
                            Mark Restocked
                          </button>
                        )}
                        {item.status === "restocked" && (
                          <span className="text-xs text-gray-500">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-gray-500 dark:text-gray-400">Loading returned items...</p>
              </div>
            )}

            {!loading && filteredReturns.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-gray-500 dark:text-gray-400">No returned items found</p>
              </div>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
