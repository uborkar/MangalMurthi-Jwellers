import React, { useEffect, useMemo, useState } from "react";
import { Download, Search, Printer } from "lucide-react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";

type Branch = "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";

// default shops (extend anytime)
const branches: Branch[] = ["Sangli", "Miraj", "Kolhapur"];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const BranchStock: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<Branch>("Sangli");
  const [data, setData] = useState<BranchStockItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load branch stock from Firestore
  useEffect(() => {
    async function load() {
      try {
        const fetched = await getShopStock(selectedBranch);
        setData(fetched);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load branch stock");
      }
    }
    load();
  }, [selectedBranch]);

  // Filter logic
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return data.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q)
      );
    });
  }, [data, searchText, categoryFilter]);

  const totalItems = filtered.length;
  const totalWeight = filtered.reduce(
    (s, r) => s + (parseFloat(r.weight || "0") || 0),
    0
  );
  const totalValue = filtered.reduce((s, r) => s + (r.price || 0), 0);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <>
      <PageMeta
        title="Branch Stock - Shops"
        description="Real-time stock at branch stores"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection title="🏪 Branch Stock" subtitle="Live branch inventory">
            
            {/* Branch Picker */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <label className="text-gray-500 dark:text-gray-400 font-medium">Select Branch</label>
                <select
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value as Branch);
                    setPage(1);
                  }}
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center gap-2 font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print
              </button>
            </div>

            {/* Summary Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="flex items-end justify-between mt-5">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Items</span>
                    <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalItems}</h4>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">⚖️</span>
                </div>
                <div className="flex items-end justify-between mt-5">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Weight</span>
                    <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalWeight.toFixed(2)}g</h4>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="flex items-end justify-between mt-5">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Value</span>
                    <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">₹{totalValue.toLocaleString()}</h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">💎 Filter by Category</label>
                <select
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Categories ({data.length})</option>
                  {Array.from(new Set(data.map(item => item.category).filter(Boolean))).sort().map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({data.filter(item => item.category === cat).length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">🔍 Search Items</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    placeholder="Search by label or category..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Label</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Category</th>
                    <th className="p-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Weight(g)</th>
                    <th className="p-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">Price(₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr key={r.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 text-gray-800 dark:text-white/90 font-medium font-mono text-xs">{r.label}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{r.category}</td>
                      <td className="p-3 text-center text-gray-800 dark:text-white/90">{r.weight}</td>
                      <td className="p-3 text-center text-gray-800 dark:text-white/90 font-semibold">
                        ₹{r.price?.toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {!paginated.length && (
                    <tr>
                      <td colSpan={4} className="text-center p-4 text-gray-500">
                        No records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} items
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary text-sm"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s} per page            
                    </option>
                  ))}
                </select>

                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                >
                  Prev
                </button>
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
};

export default BranchStock;
