// src/pages/Dashboard/ShopDashboard.tsx - Shop User Dashboard
import TASection from "../../components/common/TASection";
import QuickActions from "../../components/warehouse/QuickActions";
import { useAuth } from "../../context/AuthContext";

export default function ShopDashboard() {
  const { userProfile } = useAuth();

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Shop Overview */}
      <div className="col-span-12">
        <TASection
          title={`🏪 ${userProfile?.branch || "Shop"} Dashboard`}
          subtitle="Manage your shop operations"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Sales Today</span>
              <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">0</h4>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl mb-3">
                <span className="text-2xl">💰</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Revenue</span>
              <h4 className="mt-2 font-bold text-green-600 text-2xl dark:text-green-400">₹0</h4>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mb-3">
                <span className="text-2xl">📦</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Stock Items</span>
              <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">0</h4>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl mb-3">
                <span className="text-2xl">📋</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending Orders</span>
              <h4 className="mt-2 font-bold text-gray-800 text-2xl dark:text-white/90">0</h4>
            </div>
          </div>
        </TASection>
      </div>

      {/* Quick Actions */}
      <div className="col-span-12">
        <TASection
          title="⚡ Quick Actions"
          subtitle="Common shop operations"
        >
          <QuickActions />
        </TASection>
      </div>
    </div>
  );
}
