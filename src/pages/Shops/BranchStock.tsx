import React, { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp, Package, Download, FileSpreadsheet, X } from "lucide-react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { getShopStock, BranchStockItem } from "../../firebase/shopStock";
import * as XLSX from "xlsx";
import { useShop } from "../../context/ShopContext";

// ============================================
// 🏢 SHOP/BRANCH CONFIGURATION (Same as Distribution)
// ============================================
interface ShopConfig {
  code: string;
  name: string;
  location: string;
  type: "flagship" | "branch" | "franchise";
}

const shops: ShopConfig[] = [
  { code: "Sangli", name: "Sangli", location: "Sangli", type: "branch" },
  { code: "Kolhapur", name: "Kolhapur", location: "Kolhapur", type: "branch" },
  { code: "Miraj", name: "Miraj", location: "Miraj", type: "branch" },
  { code: "Pune", name: "Pune", location: "Pune", type: "branch" },
  { code: "Satara1", name: "Satara 1", location: "Satara", type: "branch" },
  { code: "Satara2", name: "Satara 2", location: "Satara", type: "branch" },
  { code: "Karad1", name: "Karad 1", location: "Karad", type: "branch" },
  { code: "Karad2", name: "Karad 2", location: "Karad", type: "branch" },
];

const BranchStock: React.FC = () => {
  const { setBranchStockCache } = useShop();
  
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [data, setData] = useState<BranchStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [branchStockCounts, setBranchStockCounts] = useState<Record<string, number>>({});
  const [showExportModal, setShowExportModal] = useState(false);

  // Export ALL branches to Excel
  const exportAllBranches = async () => {
    const loadingToast = toast.loading("Preparing all branches report...");
    
    try {
      const workbook = XLSX.utils.book_new();
      let grandTotal = 0;
      const branchSummary: any[] = [];

      // Load and export each branch
      for (const shop of shops) {
        const items = await getShopStock(shop.code);
        
        if (items.length === 0) continue;

        grandTotal += items.length;
        branchSummary.push({
          Branch: shop.name,
          Location: shop.location,
          "Total Items": items.length,
          Categories: new Set(items.map(i => i.category)).size,
        });

        // Group items by category
        const itemsByCategory: Record<string, typeof items> = {};
        items.forEach(item => {
          const cat = item.category || "Uncategorized";
          if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
          itemsByCategory[cat].push(item);
        });

        // Prepare data with category-wise serial numbering
        const branchData = Object.keys(itemsByCategory)
          .sort()
          .flatMap((categoryName) => {
            const categoryItems = itemsByCategory[categoryName].sort((a, b) => {
              const dateA = new Date(a.transferredAt || a.createdAt || 0).getTime();
              const dateB = new Date(b.transferredAt || b.createdAt || 0).getTime();
              return dateA - dateB;
            });

            // Reset serial to 1 for each category
            let categorySerial = 1;
            
            return categoryItems.map((item) => ({
              "Sr No": categorySerial++, // Category-wise serial
              "Barcode": item.barcode,
              "Name": item.productName || item.remark || "-",
              "Design": item.subcategory || item.design || "-",
              "Type": item.costPriceType || item.type || "-",
              "Location": item.location || "-",
              "Category": item.category || "-",
              "Status": item.status || "in-branch",
              "Received At": item.transferredAt
                ? new Date(item.transferredAt).toLocaleString()
                : item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : "-",
            }));
          });

        // Create sheet for this branch
        const worksheet = XLSX.utils.json_to_sheet(branchData);
        worksheet['!cols'] = [
          { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
          { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(workbook, worksheet, shop.name);
      }

      // Add summary sheet
      const summaryData = [
        { Field: "Report Type", Value: "All Branches Stock Report" },
        { Field: "Total Branches", Value: branchSummary.length },
        { Field: "Total Items", Value: grandTotal },
        { Field: "Generated On", Value: new Date().toLocaleString() },
        {},
        ...branchSummary
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Download
      XLSX.writeFile(workbook, `AllBranches_Stock_${Date.now()}.xlsx`);
      toast.dismiss(loadingToast);
      toast.success("All branches report downloaded!");
      setShowExportModal(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to export all branches");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Prepare data with category-wise serial numbering
    const exportData = Object.keys(itemsByCategory)
      .sort()
      .flatMap((categoryName) => {
        const categoryItems = itemsByCategory[categoryName].sort((a, b) => {
          const dateA = new Date(a.transferredAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.transferredAt || b.createdAt || 0).getTime();
          return dateA - dateB;
        });

        // Reset serial to 1 for each category
        let categorySerial = 1;
        
        return categoryItems.map((item) => ({
          "Sr No": categorySerial++, // Category-wise serial
          "Barcode": item.barcode,
          "Name": item.productName || item.remark || "-",
          "Design": item.subcategory || item.design || "-",
          "Type": item.costPriceType || item.type || "-",
          "Location": item.location || "-",
          "Category": item.category || "-",
          "Status": item.status || "in-branch",
          "Received At": item.transferredAt
            ? new Date(item.transferredAt).toLocaleString()
            : item.createdAt
            ? new Date(item.createdAt).toLocaleString()
            : "-",
        }));
      });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 8 },  // Sr No
      { wch: 25 }, // Barcode
      { wch: 20 }, // Name
      { wch: 15 }, // Design
      { wch: 15 }, // Type
      { wch: 12 }, // Location
      { wch: 15 }, // Category
      { wch: 12 }, // Status
      { wch: 20 }, // Received At
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedBranch);

    // Add summary sheet
    const summaryData = [
      { Field: "Branch", Value: selectedBranch },
      { Field: "Total Items", Value: stats.totalItems },
      { Field: "Categories", Value: stats.categories },
      { Field: "Generated On", Value: new Date().toLocaleString() },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Download
    XLSX.writeFile(workbook, `BranchStock_${selectedBranch}_${Date.now()}.xlsx`);
    toast.success("Excel file downloaded!");
    setShowExportModal(false);
  };

  // Load stock counts for all branches and auto-select best branch
  const loadAllBranchCounts = async () => {
    try {
      const counts: Record<string, number> = {};
      
      // Load stock count for each branch
      for (const shop of shops) {
        const items = await getShopStock(shop.code);
        counts[shop.code] = items.length;
      }
      
      setBranchStockCounts(counts);
      
      // Auto-select branch with most stock (or first branch with stock)
      const branchesWithStock = Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .sort(([_, a], [__, b]) => b - a); // Sort by count descending
      
      if (branchesWithStock.length > 0) {
        setSelectedBranch(branchesWithStock[0][0]);
      } else {
        // No branches have stock, default to first branch
        setSelectedBranch(shops[0].code);
      }
    } catch (error) {
      console.error("Error loading branch counts:", error);
      setSelectedBranch(shops[0].code);
    }
  };

  // Initial load
  useEffect(() => {
    loadAllBranchCounts();
  }, []);

  // Load branch stock from shop's stockItems subcollection
  const loadBranchStock = async () => {
    if (!selectedBranch) return;
    
    // DON'T use cache for Branch Stock - always load fresh to show sold items
    setLoading(true);
    try {
      // Get items from shop's stockItems subcollection
      const items = await getShopStock(selectedBranch);
      setData(items);
      
      // Update cache for other pages (like Billing)
      const branchKey = selectedBranch as "Sangli" | "Miraj" | "Kolhapur" | "Mumbai" | "Pune";
      if (branchKey) {
        setBranchStockCache(branchKey, items);
      }

      if (items.length === 0) {
        toast("No items found for this branch", { icon: "ℹ️" });
      } else {
        const availableCount = items.filter(i => i.status === "in-branch" || !i.status).length;
        const soldCount = items.filter(i => i.status === "sold").length;
        toast.success(`Loaded ${items.length} items (${availableCount} available, ${soldCount} sold)`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load branch stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranch) {
      loadBranchStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]); // Only re-run when branch changes

  // Group items by category
  const itemsByCategory = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(item =>
        item.barcode?.toLowerCase().includes(search) ||
        item.label?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search) ||
        item.productName?.toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    // Group by category
    return filtered.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, BranchStockItem[]>);
  }, [data, searchText, filterCategory]);

  // Get unique categories
  const allCategories = useMemo(() => {
    return Array.from(new Set(data.map(item => item.category).filter(Boolean))).sort();
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    const filtered = Object.values(itemsByCategory).flat();
    return {
      totalItems: filtered.length,
      totalValue: filtered.reduce((sum, item) => sum + (item.costPrice || 0), 0),
      categories: Object.keys(itemsByCategory).length,
    };
  }, [itemsByCategory]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const getCategoryStats = (categoryName: string) => {
    const items = itemsByCategory[categoryName] || [];
    const totalValue = items.reduce((sum, item) => sum + (item.costPrice || 0), 0);
    return { total: items.length, value: totalValue };
  };

  return (
    <>
      <PageMeta
        title="Branch Stock - Shops"
        description="Real-time stock at branch stores"
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide non-printable elements */
          .no-print,
          button,
          input,
          select,
          .screen-only {
            display: none !important;
          }

          /* Page setup */
          @page {
            size: A4 landscape;
            margin: 15mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Print header */
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }

          .print-header h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          }

          .print-header p {
            font-size: 12px;
            margin: 5px 0;
          }

          /* Table styles */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            page-break-inside: auto;
          }

          thead {
            display: table-header-group;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          th {
            background-color: #f3f4f6 !important;
            border: 1px solid #000;
            padding: 8px 4px;
            font-weight: bold;
            text-align: left;
          }

          td {
            border: 1px solid #ddd;
            padding: 6px 4px;
          }

          /* Category headers */
          .category-header {
            background-color: #e5e7eb !important;
            font-weight: bold;
            padding: 8px;
            margin-top: 15px;
            border: 1px solid #000;
          }

          /* Remove shadows and rounded corners */
          * {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }

        /* Print header - hidden on screen */
        .print-header {
          display: none;
        }
      `}</style>

      {/* Print Header - Only visible when printing */}
      <div className="print-header">
        <h1>MangalMurti Jewellers</h1>
        <p><strong>Branch Stock Report - {selectedBranch}</strong></p>
        <p>Generated on: {new Date().toLocaleString()}</p>
        <p>Total Items: {stats.totalItems} | Categories: {stats.categories}</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🏪 Branch Stock Management"
            subtitle="Live inventory tracking for branch locations"
          >

            {/* Branch Selector & Stats */}
            <div className="mb-6 space-y-4 no-print">
              {/* Branch Selection */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                <label className="block text-sm font-semibold mb-2 text-blue-800 dark:text-blue-400">
                  🏢 Select Branch
                </label>
                <select
                  className="w-full md:w-96 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary font-medium"
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                  }}
                  disabled={!selectedBranch}
                >
                  {!selectedBranch && <option value="">Loading branches...</option>}
                  {shops.map((shop) => {
                    const count = branchStockCounts[shop.code] || 0;
                    return (
                      <option key={shop.code} value={shop.code}>
                        {shop.name} {count > 0 ? `(${count} items)` : "(Empty)"}
                      </option>
                    );
                  })}
                </select>
                {Object.keys(branchStockCounts).length > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    💡 Auto-selected branch with most stock
                  </p>
                )}
              </div>

              {/* Summary Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl mb-3">
                    <Package className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Available</span>
                  <h4 className="mt-2 font-bold text-green-600 text-2xl dark:text-green-400">
                    {data.filter(item => item.status === "in-branch" || !item.status).length}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ready to sell</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl mb-3">
                    <span className="text-2xl">✅</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sold</span>
                  <h4 className="mt-2 font-bold text-red-600 text-2xl dark:text-red-400">
                    {data.filter(item => item.status === "sold").length}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed sales</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 mb-3">
                    <span className="text-2xl">📊</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Items</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">{data.length}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.categories} categories</p>
                </div>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="mb-6 space-y-4 no-print">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    <Search className="inline mr-1" size={16} />
                    Search
                  </label>
                  <input
                    placeholder="Search by barcode, category, item name..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-gray-400">
                    💎 Filter by Category
                  </label>
                  <select
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 focus:outline-none focus:border-primary"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Categories ({data.length})</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({data.filter(item => item.category === cat).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end">
                <button
                  className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center gap-2 font-medium transition-colors dark:bg-green-600 dark:hover:bg-green-700"
                  onClick={() => setShowExportModal(true)}
                >
                  <Download size={16} /> Export Report
                </button>
              </div>
            </div>

            {/* Category-wise Items */}
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-4xl mb-2">⏳</div>
                <p className="font-medium">Loading branch stock...</p>
              </div>
            ) : stats.totalItems === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-4xl mb-2">📦</div>
                <p className="font-medium">No items in this branch</p>
                <p className="text-sm mt-1">
                  {searchText || filterCategory
                    ? "Try adjusting your filters"
                    : "Distribute items from warehouse to see them here"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(itemsByCategory)
                  .sort()
                  .map((categoryName) => {
                    const categoryItems = itemsByCategory[categoryName].sort((a, b) => {
                      // Sort by transferredAt (oldest first) for proper serial order
                      const dateA = new Date(a.transferredAt || a.createdAt || 0).getTime();
                      const dateB = new Date(b.transferredAt || b.createdAt || 0).getTime();
                      return dateA - dateB;
                    });
                    const stats = getCategoryStats(categoryName);
                    const isExpanded = expandedCategories[categoryName] ?? true;

                    return (
                      <div
                        key={categoryName}
                        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
                      >
                        {/* Category Header */}
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 border-b border-gray-200 dark:border-gray-800 category-header">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => toggleCategory(categoryName)}
                                className="p-1 hover:bg-white/50 dark:hover:bg-white/5 rounded-lg transition-colors no-print"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={20} className="text-gray-700 dark:text-gray-300" />
                                ) : (
                                  <ChevronDown size={20} className="text-gray-700 dark:text-gray-300" />
                                )}
                              </button>
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                  💎 {categoryName}
                                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                                    ({stats.total} items)
                                  </span>
                                </h3>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Category Table */}
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 dark:bg-white/5">
                                <tr className="text-left font-semibold text-gray-700 dark:text-gray-300">
                                  <th className="p-3 text-xs font-semibold">Sr No</th>
                                  <th className="p-3 text-xs font-semibold">Barcode</th>
                                  <th className="p-3 text-xs font-semibold">Name</th>
                                  <th className="p-3 text-xs font-semibold">Design</th>
                                  <th className="p-3 text-xs font-semibold">Type</th>
                                  <th className="p-3 text-xs font-semibold">Location</th>
                                  <th className="p-3 text-xs font-semibold">Status</th>
                                  <th className="p-3 text-xs font-semibold">Received At</th>
                                </tr>
                              </thead>

                              <tbody>
                                {categoryItems.map((item, index) => {
                                  // Category-wise serial: starts from 1 for each category
                                  const categorySerial = index + 1;
                                  return (
                                    <tr
                                      key={item.id}
                                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                      <td className="p-3 font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {categorySerial}
                                      </td>
                                      <td className="p-3">
                                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                                          {item.barcode}
                                        </span>
                                      </td>
                                    <td className="p-3 font-medium text-gray-800 dark:text-white/90">
                                      {item.productName || item.remark || "-"}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                      {item.subcategory || item.design || "-"}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                      {item.costPriceType || item.type || "-"}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">
                                      {item.location || "-"}
                                    </td>
                                    <td className="p-3">
                                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                        item.status === "sold"
                                          ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                          : item.status === "returned"
                                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                                          : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                      }`}>
                                        {item.status === "in-branch" ? "Available" : item.status === "sold" ? "Sold" : item.status || "Available"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-500 dark:text-gray-400">
                                      {item.transferredAt
                                        ? new Date(item.transferredAt).toLocaleString()
                                        : item.createdAt
                                          ? new Date(item.createdAt).toLocaleString()
                                          : "-"}
                                    </td>
                                  </tr>
                                );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg no-print">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Branch Stock:</strong> Items shown here have been distributed from the warehouse.
                They are tracked in real-time and linked to the main inventory system.
              </p>
            </div>
          </TASection>
        </div>
      </div>
      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                📊 Export Branch Stock Report
              </h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Report Preview */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
                  📋 Report Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Branch:</span>
                    <p className="text-blue-900 dark:text-blue-200 font-bold">{selectedBranch}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Total Items:</span>
                    <p className="text-blue-900 dark:text-blue-200 font-bold">{stats.totalItems}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Categories:</span>
                    <p className="text-blue-900 dark:text-blue-200 font-bold">{stats.categories}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Date:</span>
                    <p className="text-blue-900 dark:text-blue-200 font-bold">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Export Format */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  📄 Export Format
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="text-green-600 dark:text-green-400 flex-shrink-0 mt-1" size={24} />
                    <div>
                      <h4 className="font-bold text-green-900 dark:text-green-300 mb-1">
                        Excel Spreadsheet (.xlsx)
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-400 mb-2">
                        Professional format with multiple sheets, perfect for inventory management
                      </p>
                      <ul className="text-xs text-green-700 dark:text-green-500 space-y-1">
                        <li>✓ Main sheet with all items (Sr No, Barcode, Name, Design, Type, Location, Status)</li>
                        <li>✓ Summary sheet with branch statistics</li>
                        <li>✓ Formatted columns with proper widths</li>
                        <li>✓ Easy to filter, sort, and analyze</li>
                        <li>✓ Compatible with Excel, Google Sheets, LibreOffice</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Preview */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  👁️ Data Preview (First 5 items)
                </h3>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="p-2 text-left font-semibold">Sr No</th>
                        <th className="p-2 text-left font-semibold">Barcode</th>
                        <th className="p-2 text-left font-semibold">Name</th>
                        <th className="p-2 text-left font-semibold">Category</th>
                        <th className="p-2 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 5).map((item, index) => (
                        <tr key={item.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2 font-mono text-blue-600 dark:text-blue-400">{item.barcode}</td>
                          <td className="p-2">{item.productName || item.remark || "-"}</td>
                          <td className="p-2">{item.category}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                              {item.status || "in-branch"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    ... and {data.length - 5} more items
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportAllBranches}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Package size={18} />
                All Branches
              </button>
              <button
                onClick={exportToExcel}
                className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Download size={18} />
                This Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BranchStock;
