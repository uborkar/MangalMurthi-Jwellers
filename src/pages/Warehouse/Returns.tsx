import React, { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import { RefreshCw, Package, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  getWarehouseReturns,
  updateWarehouseReturn,
  WarehouseReturnItem,
} from "../../firebase/salesReturns";

interface ReturnItem {
  productName: string;
  category: string;
  quantity: number;
  weight: string;
  condition: string;
  remarks: string;
}

const Returns: React.FC = () => {
  const [items, setItems] = useState<ReturnItem[]>([
    {
      productName: "",
      category: "",
      quantity: 1,
      weight: "",
      condition: "",
      remarks: "",
    },
  ]);

  const [returnedItems, setReturnedItems] = useState<WarehouseReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Load returned items from Firebase
  useEffect(() => {
    loadReturnedItems();
  }, []);

  const loadReturnedItems = async () => {
    try {
      setLoading(true);
      const data = await getWarehouseReturns();
      setReturnedItems(data);
    } catch (error) {
      console.error("Error loading returns:", error);
      toast.error("Failed to load returned items");
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setItems([
      ...items,
      {
        productName: "",
        category: "",
        quantity: 1,
        weight: "",
        condition: "",
        remarks: "",
      },
    ]);
  };

  const updateItem = <K extends keyof ReturnItem>(
    index: number,
    field: K,
    value: ReturnItem[K]
  ) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    console.log("Returned Items:", items);
    alert("Returns submitted! (Backend integration coming soon)");
  };

  const updateReturnStatus = async (id: string, newStatus: "inspected" | "restocked" | "rejected") => {
    try {
      await updateWarehouseReturn(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      loadReturnedItems(); // Reload the list
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
      inspected: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
      restocked: "bg-green-500/20 text-green-600 dark:text-green-400",
      rejected: "bg-red-500/20 text-red-600 dark:text-red-400",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const filteredReturns = filterStatus === "all" 
    ? returnedItems 
    : returnedItems.filter(item => item.status === filterStatus);

  const inputStyle =
    "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta
        title="Returns to Warehouse"
        description="Manage product returns from shops to warehouse"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="↩️ Return Items to Warehouse"
            subtitle="Record and track items returned from shops to warehouse"
          >
            {/* Return Items */}
            <div className="space-y-4">
              {items.map((row, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] grid md:grid-cols-6 gap-4 shadow-sm"
                >
                  <input
                    type="text"
                    placeholder="Product Name"
                    className={inputStyle}
                    value={row.productName}
                    onChange={(e) =>
                      updateItem(index, "productName", e.target.value)
                    }
                  />

                  <input
                    type="text"
                    placeholder="Category"
                    className={inputStyle}
                    value={row.category}
                    onChange={(e) =>
                      updateItem(index, "category", e.target.value)
                    }
                  />

                  <input
                    type="number"
                    placeholder="Qty"
                    className={inputStyle}
                    value={row.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", Number(e.target.value))
                    }
                  />

                  <input
                    type="text"
                    placeholder="Weight"
                    className={inputStyle}
                    value={row.weight}
                    onChange={(e) =>
                      updateItem(index, "weight", e.target.value)
                    }
                  />

                  <select
                    className={inputStyle}
                    value={row.condition}
                    onChange={(e) =>
                      updateItem(index, "condition", e.target.value)
                    }
                  >
                    <option value="">Condition</option>
                    <option value="Good">Good</option>
                    <option value="Polishing Needed">Polishing Needed</option>
                    <option value="Damaged">Damaged</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Remarks"
                    className={inputStyle}
                    value={row.remarks}
                    onChange={(e) =>
                      updateItem(index, "remarks", e.target.value)
                    }
                  />

                  {/* Remove Button */}
                  <div className="flex items-center justify-center col-span-6 md:col-span-1">
                    <button
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors dark:bg-red-600 dark:hover:bg-red-700"
                      onClick={() => removeRow(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Row */}
            <button
              className="mt-5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
              onClick={addRow}
            >
              + Add Another Returned Item
            </button>

            {/* Submit */}
            <button
              className="mt-5 ml-4 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700"
              onClick={handleSubmit}
            >
              Submit Returns
            </button>
          </TASection>
        </div>

        {/* Returned Items from Shops */}
        <div className="col-span-12">
          <TASection
            title="📦 Returned Items from Shops"
            subtitle="Manage and process returned items"
          >
            {/* Filter and Refresh */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <label className="text-gray-500 dark:text-gray-400 font-medium">Filter Status:</label>
                <select
                  className={inputStyle + " w-48"}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Returns</option>
                  <option value="pending">Pending</option>
                  <option value="inspected">Inspected</option>
                  <option value="restocked">Restocked</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <button
                onClick={loadReturnedItems}
                disabled={loading}
                className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 font-medium transition-colors"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Returns Table */}
            {filteredReturns.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Label</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Product</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Category</th>
                      <th className="p-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Qty</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">From</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Condition</th>
                      <th className="p-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Status</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Return Date</th>
                      <th className="p-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturns.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3 text-gray-800 dark:text-white/90 font-mono text-xs">{item.label}</td>
                        <td className="p-3 text-gray-800 dark:text-white/90">{item.productName}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">{item.category}</td>
                        <td className="p-3 text-center text-gray-800 dark:text-white/90">{item.quantity}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 rounded-lg text-xs font-medium">
                            {item.returnedFrom}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">{item.condition}</td>
                        <td className="p-3 text-center">{getStatusBadge(item.status)}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-400 text-xs">
                          {new Date(item.returnDate).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            {item.status === "pending" && (
                              <>
                                <button
                                  onClick={() => item.id && updateReturnStatus(item.id, "inspected")}
                                  className="px-2 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs flex items-center gap-1 font-medium transition-colors"
                                  title="Mark as Inspected"
                                >
                                  <CheckCircle size={12} /> Inspect
                                </button>
                                <button
                                  onClick={() => item.id && updateReturnStatus(item.id, "rejected")}
                                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs flex items-center gap-1 font-medium transition-colors dark:bg-red-600 dark:hover:bg-red-700"
                                  title="Reject"
                                >
                                  <XCircle size={12} /> Reject
                                </button>
                              </>
                            )}
                            {item.status === "inspected" && (
                              <button
                                onClick={() => item.id && updateReturnStatus(item.id, "restocked")}
                                className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                                title="Restock Item"
                              >
                                <Package size={12} /> Restock
                              </button>
                            )}
                            {(item.status === "restocked" || item.status === "rejected") && (
                              <span className="text-gray-400 text-xs">Completed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl">
                <Package size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No returned items found</p>
                <p className="text-sm mt-1">Items returned from shops will appear here</p>
              </div>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
};

export default Returns;
