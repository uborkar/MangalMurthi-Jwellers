// src/pages/Dashboard/AdminDashboard.tsx - Admin Dashboard
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import WarehouseStats from "../../components/warehouse/WarehouseStats";
import QuickActions from "../../components/warehouse/QuickActions";
import TASection from "../../components/common/TASection";

export default function AdminDashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Admin Welcome */}
      <div className="col-span-12">
        <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white">
          <h1 className="text-2xl font-bold mb-2">👑 Admin Dashboard</h1>
          <p className="text-blue-100">Complete system overview and management</p>
        </div>
      </div>

      {/* Warehouse Statistics */}
      <div className="col-span-12">
        <TASection
          title="📦 Warehouse Overview"
          subtitle="Real-time inventory status"
        >
          <WarehouseStats />
        </TASection>
      </div>

      {/* Quick Actions */}
      <div className="col-span-12">
        <TASection
          title="⚡ Quick Actions"
          subtitle="Common operations"
        >
          <QuickActions />
        </TASection>
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />
        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      <div className="col-span-12">
        <StatisticsChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentOrders />
      </div>
    </div>
  );
}
