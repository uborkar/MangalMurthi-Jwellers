// src/pages/Warehouse/Categorization.tsx - Review and Approve Tagged Items
import { useEffect, useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, AlertTriangle, Search, Trash2 } from "lucide-react";

import { getTaggedItems, TaggedItem } from "../../firebase/tagged";
import { addWarehouseStock } from "../../firebase/warehouse";
import { deleteAllTaggedItems } from "../../firebase/tagged";

const inputStyle =
  "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary";

export default function Categorization() {
  const [taggedItems, setTaggedItems] = useState<TaggedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Load tagged items
  useEffect(() => {
    loadData();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showClearModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showClearModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      const tagged = await getTaggedItems();
      setTaggedItems(tagged);
      toast.success(`Loaded ${tagged.length} tagged items`);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  const filteredItems = taggedItems.filter(item => {
    const matchesSearch = !searchText || 
      item.label.toLowerCase().includes(searchText.toLowerCase()) ||
      item.category.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.subcategory || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (item.location || "").toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus = filterStatus === "all" || item.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    filteredItems.forEach(item => {
      if (item.id) all[item.id] = true;
    });
    setSelectedIds(all);
  };

  const deselectAll = () => setSelectedIds({});

  // Approve and move to warehouse stock
  const approveSelected = async () => {
    const selectedItemIds = Object.keys(selectedIds).filter(k => selectedIds[k]);
    
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item to approve");
      return;
    }

    const itemsToApprove = taggedItems.filter(item => item.id && selectedItemIds.includes(item.id));

    const loadingToast = toast.loading(`Approving ${itemsToApprove.length} items...`);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const item of itemsToApprove) {
        try {
          await addWarehouseStock({
            barcode: item.label,
            category: item.category,
            subcategory: item.subcategory || "",
            location: item.location || "",
            weight: item.weight || "",
            purity: item.purity || "Gold Forming",
            costPrice: item.price || 0,
            status: "in_stock",
            taggedItemId: item.id || "",
            stockInDate: new Date(),
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to approve item ${item.label}:`, error);
          failedCount++;
        }
      }

      toast.dismiss(loadingToast);

      if (successCount > 0 && failedCount === 0) {
        toast.success(`🎉 Successfully approved ${successCount} items!`);
      } else if (successCount > 0 && failedCount > 0) {
        toast.success(`Approved ${successCount} items. ${failedCount} failed.`, { duration: 5000 });
      } else {
        toast.error("Failed to approve items");
      }

      setSelectedIds({});
      await loadData();

    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error during approval process");
      console.error(error);
    }
  };

  // Clear all categorization
  const handleClearAll = async () => {
    const loadingToast = toast.loading("Clearing all tagged items...");
    
    try {
      const deletedCount = await deleteAllTaggedItems();
      
      toast.dismiss(loadingToast);
      toast.success(`🎉 Successfully deleted ${deletedCount} tagged items!`);
      
      setShowClearModal(false);
      setSelectedIds({});
      await loadData();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to clear tagged items!");
      console.error(error);
    }
  };

  // Calculate statistics
  const stats = {
    total: taggedItems.length,
    pending: taggedItems.filter(t => t.status === "pending").length,
    approved: taggedItems.filter(t => t.status === "approved").length,
    rejected: taggedItems.filter(t => t.status === "rejected").length,
  };

  return (
    <>
      <PageMeta
        title="Categorization & Approval"
        description="Review and approve tagged items"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📋 Categorization & Approval"
            subtitle="Review, approve, or reject labeled items before stock-in"
          >
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Tagged</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {stats.total}
                  </h4>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Pending Review</span>
                  <h4 className="mt-2 font-bold text-yellow-600 text-title-sm dark:text-yellow-400">
                    {stats.pending}
                  </h4>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Approved</span>
                  <h4 className="mt-2 font-bold text-green-600 text-title-sm dark:text-green-400">
                    {stats.approved}
                  </h4>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <XCircle className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Rejected</span>
                  <h4 className="mt-2 font-bold text-red-600 text-title-sm dark:text-red-400">
                    {stats.rejected}
                  </h4>
                </div>
              </div>
            </div>

            {/* Filters & Actions */}
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    <Search className="inline mr-1" size={16} />
                    Search
                  </label>
                  <input
                    type="text"
                    className={inputStyle}
                    placeholder="Search by barcode, category, location..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    Filter by Status
                  </label>
                  <select
                    className={inputStyle}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    Actions
                  </label>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium"
                      onClick={selectAll}
                    >
                      Select All
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium"
                      onClick={deselectAll}
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <button
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors dark:bg-red-600 dark:hover:bg-red-700 flex items-center gap-2"
                  onClick={() => setShowClearModal(true)}
                >
                  <Trash2 size={18} />
                  Clear All Categorization
                </button>

                <button
                  className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={approveSelected}
                  disabled={Object.values(selectedIds).filter(Boolean).length === 0 || loading}
                >
                  <CheckCircle size={18} />
                  Approve Selected ({Object.values(selectedIds).filter(Boolean).length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                    <th className="p-3 w-12 border-b border-gray-200 dark:border-gray-800">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && filteredItems.every(item => item.id && selectedIds[item.id])}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll();
                          } else {
                            deselectAll();
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Barcode</th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Category</th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Design</th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Location</th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Purity</th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Weight</th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Price</th>
                    <th className="p-3 text-xs font-semibold border-b border-gray-200 dark:border-gray-800">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-2">⏳</div>
                        <p className="font-medium">Loading tagged items...</p>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-2">📦</div>
                        <p className="font-medium">No items found</p>
                        <p className="text-sm mt-1">
                          {searchText ? "Try adjusting your search" : "No tagged items to review"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={!!(item.id && selectedIds[item.id])}
                            onChange={() => item.id && toggleSelect(item.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                            {item.label}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-800 dark:text-white/90">
                          {item.category}
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">
                          {item.subcategory || "-"}
                        </td>
                        <td className="p-3 text-gray-600 dark:text-gray-400">
                          {item.location || "-"}
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-yellow-600 dark:text-yellow-400 font-semibold">
                            {item.purity || "-"}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-800 dark:text-white/90">
                          {item.weight || "-"}
                        </td>
                        <td className="p-3 font-semibold text-green-600 dark:text-green-400">
                          ₹{item.price?.toLocaleString() || 0}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              item.status === "pending"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                : item.status === "approved"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {item.status === "pending" ? "Pending" : item.status === "approved" ? "Approved" : "Rejected"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Info */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>💡 Note:</strong> Review tagged items and approve them to move to warehouse stock. 
                Approved items will be available for distribution to shop locations.
              </p>
            </div>
          </TASection>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-lg"
            style={{ zIndex: 99999 }}
            onClick={() => setShowClearModal(false)}
          />
          <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full border-2 border-red-500 dark:border-red-600 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  Clear All Categorization?
                </h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will <strong className="text-red-600 dark:text-red-400">permanently delete all {stats.total} tagged items</strong> from the categorization. 
                This action cannot be undone!
              </p>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-medium transition-colors"
                  onClick={() => setShowClearModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                  onClick={handleClearAll}
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
