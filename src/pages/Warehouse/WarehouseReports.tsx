// src/pages/Warehouse/WarehouseReports.tsx - Warehouse Reports & Analytics
import { useEffect, useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Download, TrendingUp, Package, CheckCircle, Truck, ShoppingBag, Filter, FileSpreadsheet, Settings } from "lucide-react";
import {
  getItemCountByStatus,
  getItemCountByCategory,
  getAllWarehouseItems,
  ItemStatus,
  WarehouseItem,
} from "../../firebase/warehouseItems";
import { useCategories } from "../../hooks/useCategories";
import { useLocations } from "../../hooks/useLocations";
import { generateWarehouseReport, ReportConfig } from "../../services/reportGenerator";

export default function WarehouseReports() {
  const [loading, setLoading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<ItemStatus, number>>({
    tagged: 0,
    printed: 0,
    stocked: 0,
    distributed: 0,
    sold: 0,
    returned: 0,
  });
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [allItems, setAllItems] = useState<WarehouseItem[]>([]);
  
  // Detailed view state
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<"serial" | "date" | "status">("serial");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Report configuration
  const [showReportConfig, setShowReportConfig] = useState(false);
  const [reportConfig, setReportConfig] = useState<Partial<ReportConfig>>({
    groupBy: "category",
    showSummary: true,
    showCategoryTotals: true,
    showGrandTotal: true,
  });
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  
  const { categories } = useCategories();
  const { locations } = useLocations();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [counts, categories, items] = await Promise.all([
        getItemCountByStatus(),
        getItemCountByCategory(),
        getAllWarehouseItems(),
      ]);

      setStatusCounts(counts);
      setCategoryCounts(categories);
      setAllItems(items);

      toast.success("Reports loaded successfully");
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters to items
  const getFilteredItems = () => {
    return allItems.filter((item) => {
      // Category filter
      if (filterCategory !== "all" && item.category !== filterCategory) return false;
      
      // Location filter
      if (filterLocation !== "all" && item.location !== filterLocation) return false;
      
      // Status filter
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      
      // Date range filter
      if (filterDateFrom) {
        const itemDate = new Date(item.taggedAt);
        const fromDate = new Date(filterDateFrom);
        if (itemDate < fromDate) return false;
      }
      
      if (filterDateTo) {
        const itemDate = new Date(item.taggedAt);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (itemDate > toDate) return false;
      }
      
      return true;
    });
  };

  // Professional Report Generation
  const exportProfessionalReport = async (reportType: "all" | "stock" | "distribution" | "balance") => {
    const loadingToast = toast.loading("Generating professional report...");

    try {
      const filteredItems = getFilteredItems();
      
      if (filteredItems.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No items to export with current filters");
        return;
      }

      // Filter items based on report type
      let itemsToExport = filteredItems;
      let title = "Warehouse Report";
      let subtitle = "";

      if (reportType === "stock") {
        itemsToExport = filteredItems.filter(item => item.status === "stocked");
        title = "Stock Report";
        subtitle = "Current Warehouse Inventory";
      } else if (reportType === "distribution") {
        itemsToExport = filteredItems.filter(item => item.status === "distributed");
        title = "Distribution Report";
        subtitle = "Items Distributed to Shops";
      } else if (reportType === "balance") {
        title = "Balance Sheet Report";
        subtitle = "Complete Warehouse Balance";
      }

      if (itemsToExport.length === 0) {
        toast.dismiss(loadingToast);
        toast.error(`No items found for ${reportType} report`);
        return;
      }

      // Generate professional report
      await generateWarehouseReport(itemsToExport, {
        ...reportConfig,
        title,
        subtitle,
        companyName: "MangalMurti Jewellers",
        location: filterLocation !== "all" ? filterLocation : undefined,
        reportType,
        dateRange: filterDateFrom && filterDateTo ? {
          from: filterDateFrom,
          to: filterDateTo
        } : undefined,
        includeColumns: [
          "serial",
          "barcode",
          "itemName",
          "design",
          "location",
          "weight",
          "costPrice",
          "cpType",
          "status",
          "taggedAt",
        ],
      });

      toast.dismiss(loadingToast);
      toast.success(`✅ Professional ${reportType} report generated (${itemsToExport.length} items)`);
    } catch (error) {
      console.error("Error generating professional report:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to generate report");
    }
  };
  
  const clearFilters = () => {
    setFilterCategory("all");
    setFilterLocation("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    toast.success("Filters cleared");
  };
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  const toggleAllCategories = (expand: boolean) => {
    const newState: Record<string, boolean> = {};
    Object.keys(categoryCounts).forEach(cat => {
      newState[cat] = expand;
    });
    setExpandedCategories(newState);
  };
  
  const getSortedItems = (items: WarehouseItem[]) => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "serial") {
        comparison = a.serial - b.serial;
      } else if (sortBy === "date") {
        comparison = new Date(a.taggedAt).getTime() - new Date(b.taggedAt).getTime();
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };
  
  const getStatusColor = (status: ItemStatus) => {
    const colors = {
      tagged: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      printed: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      stocked: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      distributed: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
      sold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
      returned: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    };
    return colors[status] || colors.tagged;
  };

  const totalItems = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const filteredItems = getFilteredItems();
  const filteredCount = filteredItems.length;
  
  // Group filtered items by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, WarehouseItem[]>);

  return (
    <>
      <PageMeta title="Warehouse Reports" description="Analytics and reports for warehouse operations" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 Warehouse Reports & Analytics"
            subtitle="Comprehensive overview of warehouse operations"
          >
            {/* Export Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => exportProfessionalReport("all")}
                className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <Download size={18} />
                Professional Report
              </button>
              
              <button
                onClick={() => exportProfessionalReport("stock")}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <Package size={18} />
                Stock Report
              </button>
              
              <button
                onClick={() => exportProfessionalReport("distribution")}
                className="px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <Truck size={18} />
                Distribution Report
              </button>
              
              <button
                onClick={() => exportProfessionalReport("balance")}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                disabled={loading}
              >
                <FileSpreadsheet size={18} />
                Balance Report
              </button>
              
              <button
                onClick={() => setShowReportConfig(!showReportConfig)}
                className="px-5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Settings size={18} />
                Report Settings
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 ml-auto"
              >
                <Filter size={18} />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>

            {/* Report Configuration Panel */}
            {showReportConfig && (
              <div className="mb-6 p-5 rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700">
                <h3 className="font-bold mb-4 text-indigo-900 dark:text-indigo-100">⚙️ Report Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm block mb-1 font-medium text-indigo-800 dark:text-indigo-200">Group By</label>
                    <select
                      value={reportConfig.groupBy}
                      onChange={(e) => setReportConfig({...reportConfig, groupBy: e.target.value as any})}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="category">Category</option>
                      <option value="location">Location</option>
                      <option value="status">Status</option>
                      <option value="none">No Grouping</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showSummary"
                      checked={reportConfig.showSummary}
                      onChange={(e) => setReportConfig({...reportConfig, showSummary: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <label htmlFor="showSummary" className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                      Show Summary Section
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showCategoryTotals"
                      checked={reportConfig.showCategoryTotals}
                      onChange={(e) => setReportConfig({...reportConfig, showCategoryTotals: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <label htmlFor="showCategoryTotals" className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                      Show Category Totals
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showGrandTotal"
                      checked={reportConfig.showGrandTotal}
                      onChange={(e) => setReportConfig({...reportConfig, showGrandTotal: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <label htmlFor="showGrandTotal" className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                      Show Grand Total
                    </label>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    <strong>💡 Professional Features:</strong> Reports include company header, summary statistics, 
                    category-wise grouping with totals, formatted tables, and grand totals. All controlled through code!
                  </p>
                </div>
              </div>
            )}

            {/* Filters Section */}
            {showFilters && (
              <div className="mb-6 p-5 rounded-xl border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700">
                <h3 className="font-bold mb-4 text-gray-800 dark:text-white">🔍 Filter Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm block mb-1 font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium text-gray-700 dark:text-gray-300">Location</label>
                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="all">All Locations</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="all">All Statuses</option>
                      <option value="tagged">Tagged</option>
                      <option value="printed">Printed</option>
                      <option value="stocked">Stocked</option>
                      <option value="distributed">Distributed</option>
                      <option value="sold">Sold</option>
                      <option value="returned">Returned</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium text-gray-700 dark:text-gray-300">Date From</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="text-sm block mb-1 font-medium text-gray-700 dark:text-gray-300">Date To</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                  <div className="flex-1" />
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    Showing <strong className="mx-1">{filteredCount}</strong> of <strong className="mx-1">{totalItems}</strong> items
                  </div>
                </div>
              </div>
            )}

            {/* Overall Statistics */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-14 h-14 bg-blue-500 rounded-xl">
                    <Package className="text-white" size={28} />
                  </div>
                  <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <h3 className="text-sm text-blue-800 dark:text-blue-400 font-medium mb-1">Total Items</h3>
                <p className="text-4xl font-bold text-blue-900 dark:text-blue-300">{totalItems}</p>
                <p className="text-xs text-blue-700 dark:text-blue-500 mt-2">Across all statuses</p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">📈 Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800 mb-3">
                    <span className="text-xl">🏷️</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Tagged</span>
                  <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">
                    {statusCounts.tagged}
                  </h4>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-900/30 mb-3">
                    <span className="text-xl">🖨️</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Printed</span>
                  <h4 className="mt-1 font-bold text-blue-600 text-xl dark:text-blue-400">
                    {statusCounts.printed}
                  </h4>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-900/30 mb-3">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Stocked</span>
                  <h4 className="mt-1 font-bold text-green-600 text-xl dark:text-green-400">
                    {statusCounts.stocked}
                  </h4>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-900/30 mb-3">
                    <Truck className="text-purple-600 dark:text-purple-400" size={20} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Distributed</span>
                  <h4 className="mt-1 font-bold text-purple-600 text-xl dark:text-purple-400">
                    {statusCounts.distributed}
                  </h4>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg dark:bg-yellow-900/30 mb-3">
                    <ShoppingBag className="text-yellow-600 dark:text-yellow-400" size={20} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Sold</span>
                  <h4 className="mt-1 font-bold text-yellow-600 text-xl dark:text-yellow-400">
                    {statusCounts.sold}
                  </h4>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-900/30 mb-3">
                    <span className="text-xl">↩️</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Returned</span>
                  <h4 className="mt-1 font-bold text-red-600 text-xl dark:text-red-400">
                    {statusCounts.returned}
                  </h4>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">💎 Category Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(categoryCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => (
                    <div
                      key={category}
                      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">💎</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {((count / totalItems) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-white">{category}</h4>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{count}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">items</p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                <strong>💡 Report Types:</strong>
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-4">
                <li>• <strong>Export All Data:</strong> Complete warehouse data with filters applied</li>
                <li>• <strong>Stock Report:</strong> Items currently in warehouse stock (status: stocked)</li>
                <li>• <strong>Distribution Report:</strong> Items distributed to shops with shop-wise summary</li>
                <li>• <strong>Balance Report:</strong> Status and category-wise balance sheet</li>
              </ul>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
                💾 All reports are exported as Excel files with multiple sheets for detailed analysis
              </p>
            </div>
          </TASection>
        </div>

        {/* Detailed Item View Section */}
        <div className="col-span-12">
          <TASection
            title="📋 Detailed Item View"
            subtitle="Complete item-by-item breakdown with all details"
          >
            {/* View Controls */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
              <button
                onClick={() => setShowDetailedView(!showDetailedView)}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Package size={18} />
                {showDetailedView ? "Hide Detailed View" : "Show Detailed View"}
              </button>
              
              {showDetailedView && (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAllCategories(true)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={() => toggleAllCategories(false)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Collapse All
                    </button>
                  </div>
                  
                  <div className="flex gap-2 items-center ml-auto">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
                    >
                      <option value="serial">Serial Number</option>
                      <option value="date">Date</option>
                      <option value="status">Status</option>
                    </select>
                    
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Detailed View Content */}
            {showDetailedView && (
              <div className="space-y-4">
                {filteredCount === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                    <div className="text-4xl mb-2">📦</div>
                    <p className="font-medium">No items found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  Object.entries(itemsByCategory)
                    .sort(([, a], [, b]) => b.length - a.length)
                    .map(([category, items]) => {
                      const isExpanded = expandedCategories[category] ?? true;
                      const sortedItems = getSortedItems(items);
                      
                      // Calculate category statistics
                      const categoryStats = {
                        total: items.length,
                        totalWeight: items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0),
                        totalCost: items.reduce((sum, item) => sum + (item.costPrice || 0), 0),
                        byStatus: items.reduce((acc, item) => {
                          acc[item.status] = (acc[item.status] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>),
                      };

                      return (
                        <div
                          key={category}
                          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
                        >
                          {/* Category Header */}
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => toggleCategory(category)}
                                className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-xl text-white text-2xl">
                                  💎
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {category}
                                    <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                                      ({categoryStats.total} items)
                                    </span>
                                  </h3>
                                  <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Weight: {categoryStats.totalWeight.toFixed(2)}g</span>
                                    <span>•</span>
                                    <span>Value: ₹{categoryStats.totalCost.toLocaleString()}</span>
                                    <span>•</span>
                                    <span className="flex gap-2">
                                      {Object.entries(categoryStats.byStatus).map(([status, count]) => (
                                        <span key={status} className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(status as ItemStatus)}`}>
                                          {status}: {count}
                                        </span>
                                      ))}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-gray-400">
                                  {isExpanded ? "▼" : "▶"}
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Category Items Table */}
                          {isExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                                  <tr className="text-left">
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Serial</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Barcode</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Item Name</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Design</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Location</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Weight</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">CP Type</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Status</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Tagged At</th>
                                    <th className="p-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Details</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedItems.map((item, idx) => (
                                    <tr
                                      key={item.id || idx}
                                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                      <td className="p-3 font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {item.serial}
                                      </td>
                                      <td className="p-3">
                                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg">
                                          {item.barcode}
                                        </span>
                                      </td>
                                      <td className="p-3 font-medium text-gray-800 dark:text-white/90 max-w-xs truncate">
                                        {item.remark || "-"}
                                      </td>
                                      <td className="p-3 text-gray-600 dark:text-gray-400">
                                        {item.subcategory || "-"}
                                      </td>
                                      <td className="p-3 text-gray-600 dark:text-gray-400">
                                        {item.location}
                                      </td>
                                      <td className="p-3 text-gray-600 dark:text-gray-400 font-mono">
                                        {item.weight || "-"}
                                      </td>
                                      {/* <td className="p-3 text-gray-800 dark:text-white font-semibold">
                                        ₹{item.costPrice?.toLocaleString() || 0}
                                      </td> */}
                                      <td className="p-3">
                                        <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded">
                                          {item.costPriceType}
                                        </span>
                                      </td>
                                      <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                                          {item.status}
                                        </span>
                                      </td>
                                      <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(item.taggedAt).toLocaleDateString()}
                                      </td>
                                      <td className="p-3">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                          {item.stockedAt && (
                                            <div>📦 Stocked: {new Date(item.stockedAt).toLocaleDateString()}</div>
                                          )}
                                          {item.distributedAt && (
                                            <div>🚚 Dist: {new Date(item.distributedAt).toLocaleDateString()}</div>
                                          )}
                                          {item.distributedTo && (
                                            <div>🏪 To: {item.distributedTo}</div>
                                          )}
                                          {item.soldAt && (
                                            <div>💰 Sold: {new Date(item.soldAt).toLocaleDateString()}</div>
                                          )}
                                          {item.returnedAt && (
                                            <div>↩️ Returned: {new Date(item.returnedAt).toLocaleDateString()}</div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              
                              {sortedItems.length > 50 && (
                                <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-gray-800">
                                  Showing all {sortedItems.length} items in this category
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {/* Info Box for Detailed View */}
            {showDetailedView && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  <strong>💡 Detailed View Features:</strong>
                </p>
                <ul className="text-sm text-indigo-800 dark:text-indigo-300 space-y-1 ml-4 mt-2">
                  <li>• <strong>Category-wise grouping</strong> with statistics (count, weight, value)</li>
                  <li>• <strong>Complete item details</strong> in table format with all fields</li>
                  <li>• <strong>Sortable columns</strong> by serial, date, or status</li>
                  <li>• <strong>Expandable/collapsible</strong> categories for easy navigation</li>
                  <li>• <strong>Timeline tracking</strong> showing stocked, distributed, and sold dates</li>
                </ul>
              </div>
            )}
          </TASection>
        </div>
      </div>
    </>
  );
}
