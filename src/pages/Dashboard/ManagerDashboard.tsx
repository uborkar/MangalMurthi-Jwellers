// src/pages/Dashboard/ManagerDashboard.tsx - Manager Dashboard
import TASection from "../../components/common/TASection";
import WarehouseStats from "../../components/warehouse/WarehouseStats";
import QuickActions from "../../components/warehouse/QuickActions";

export default function ManagerDashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Key Metrics */}
      <div className="col-span-12">
        <TASection
          title="📈 Business Overview"
          subtitle="Key performance metrics"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl mb-3">
                <span className="text-2xl">📦</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Items</span>
              <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">0</h4>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl mb-3">
                <span className="text-2xl">💰</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Sales This Month</span>
              <h4 className="mt-2 font-bold text-green-600 text-2xl dark:text-green-400">₹0</h4>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mb-3">
                <span className="text-2xl">🏪</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Active Branches</span>
              <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">5</h4>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Expenses</span>
              <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">₹0</h4>
            </div>
          </div>
        </TASection>
      </div>

      {/* Warehouse Overview */}
      <div className="col-span-12">
        <TASection
          title="📦 Warehouse Status"
          subtitle="Real-time inventory overview"
        >
          <WarehouseStats />
        </TASection>
      </div>

      {/* Quick Actions */}
      <div className="col-span-12">
        <TASection
          title="⚡ Quick Access"
          subtitle="Reports and analytics"
        >
          <QuickActions />
        </TASection>
      </div>
    </div>
  );
}
