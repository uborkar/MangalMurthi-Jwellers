// src/pages/Dashboard/WarehouseDashboard.tsx - Warehouse User Dashboard
import WarehouseStats from "../../components/warehouse/WarehouseStats";
import QuickActions from "../../components/warehouse/QuickActions";
import TASection from "../../components/common/TASection";

export default function WarehouseDashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Warehouse Statistics - Full Width */}
      <div className="col-span-12">
        <TASection
          title="📦 Warehouse Overview"
          subtitle="Real-time inventory status across all stages"
        >
          <WarehouseStats />
        </TASection>
      </div>

      {/* Quick Actions */}
      <div className="col-span-12">
        <TASection
          title="⚡ Quick Actions"
          subtitle="Common warehouse operations"
        >
          <QuickActions />
        </TASection>
      </div>
    </div>
  );
}
