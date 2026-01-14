// src/pages/CA/CADashboard.tsx - CA Reports Dashboard
import { Link } from "react-router-dom";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import {
  FileText,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ArrowRight,
} from "lucide-react";

export default function CADashboard() {
  const reportCategories = [
    {
      title: "Purchase Reports",
      icon: ShoppingCart,
      color: "blue",
      reports: [
        {
          name: "Purchase Annexure 1A",
          description: "Supplier-wise & Product-wise Purchase Register",
          path: "/ca/purchase-annexure-1a",
        },
        {
          name: "Purchase Return Annexure 2A",
          description: "Supplier-wise & Product-wise Purchase Returns",
          path: "/ca/purchase-annexure-2a",
        },
      ],
    },
    {
      title: "Sales Reports",
      icon: TrendingUp,
      color: "green",
      reports: [
        {
          name: "Sales Annexure 1A",
          description: "Customer-wise & Product-wise Sales Register",
          path: "/ca/sales-annexure-1a",
        },
        {
          name: "Sales Return Annexure 2A",
          description: "Customer-wise & Product-wise Sales Returns",
          path: "/ca/sales-annexure-2a",
        },
      ],
    },
  ];

  return (
    <>
      <PageMeta
        title="CA Reports Dashboard"
        description="GST-compliant reports for Chartered Accountants"
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📊 CA Reports Dashboard"
            subtitle="GST-Compliant Purchase & Sales Reports for Chartered Accountants"
          >
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <FileText className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-1">
                    GST Annexure Reports
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Generate industry-standard GST reports as per Indian tax compliance requirements.
                    All reports include CGST, SGST, IGST breakdowns and can be exported to Excel/PDF.
                  </p>
                </div>
              </div>
            </div>

            {/* Report Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reportCategories.map((category, idx) => {
                const Icon = category.icon;
                const colorClasses = {
                  blue: "from-blue-500 to-blue-600",
                  green: "from-green-500 to-green-600",
                  purple: "from-purple-500 to-purple-600",
                  orange: "from-orange-500 to-orange-600",
                };

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden"
                  >
                    {/* Category Header */}
                    <div
                      className={`p-4 bg-gradient-to-r ${
                        colorClasses[category.color as keyof typeof colorClasses]
                      } text-white`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={24} />
                        <h3 className="text-lg font-semibold">{category.title}</h3>
                      </div>
                    </div>

                    {/* Reports List */}
                    <div className="p-4 space-y-3">
                      {category.reports.map((report, reportIdx) => (
                        <Link
                          key={reportIdx}
                          to={report.path}
                          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary">
                                {report.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {report.description}
                              </p>
                            </div>
                            <ArrowRight
                              className="text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all"
                              size={20}
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <div className="flex items-center justify-between mb-2">
                  <Package className="text-blue-600 dark:text-blue-400" size={24} />
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    PURCHASES
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">4</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Report Types</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    SALES
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">4</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Report Types</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <div className="flex items-center justify-between mb-2">
                  <Users className="text-purple-600 dark:text-purple-400" size={24} />
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                    PARTIES
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">2</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">View Types</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="text-orange-600 dark:text-orange-400" size={24} />
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                    FORMATS
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Export Options</p>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                📋 Report Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">GST Compliant</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All reports follow Indian GST format with CGST, SGST, IGST breakdowns
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Multiple Views</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Supplier/Customer-wise and Product-wise analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Export Options</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Download as Excel, PDF, or CSV for CA submission
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Date Filters</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Financial year, quarter, month, or custom date range
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
}
