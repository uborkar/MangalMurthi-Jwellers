import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import WarehouseDashboard from "./WarehouseDashboard";
import ShopDashboard from "./ShopDashboard";

export default function Home() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Dashboard - Mangal-Murthi Jewellers"
        description="Your personalized dashboard"
      />
      
      {userRole === "admin" && <AdminDashboard />}
      {userRole === "manager" && <ManagerDashboard />}
      {userRole === "warehouse" && <WarehouseDashboard />}
      {userRole === "shop" && <ShopDashboard />}
      
      {!userRole && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Role Assigned
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please contact administrator to assign your role.
          </p>
        </div>
      )}
    </>
  );
}
