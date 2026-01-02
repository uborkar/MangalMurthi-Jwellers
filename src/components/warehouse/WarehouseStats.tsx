// src/components/warehouse/WarehouseStats.tsx - Real-time Warehouse Statistics
import { useEffect, useState } from "react";
import { Package, CheckCircle, Truck, ShoppingBag, AlertCircle, Printer } from "lucide-react";
import {
  getItemCountByStatus,
  getTotalValueByStatus,
  ItemStatus,
} from "../../firebase/warehouseItems";
import toast from "react-hot-toast";

interface StatCard {
  label: string;
  count: number;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export default function WarehouseStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [counts, values] = await Promise.all([
        getItemCountByStatus(),
        getTotalValueByStatus(),
      ]);

      const statsData: StatCard[] = [
        {
          label: "Tagged",
          count: counts.tagged || 0,
          value: values.tagged || 0,
          icon: <Package size={24} />,
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-100 dark:bg-gray-800",
        },
        {
          label: "Printed",
          count: counts.printed || 0,
          value: values.printed || 0,
          icon: <Printer size={24} />,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-100 dark:bg-blue-900/20",
        },
        {
          label: "In Stock",
          count: counts.stocked || 0,
          value: values.stocked || 0,
          icon: <CheckCircle size={24} />,
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-100 dark:bg-green-900/20",
        },
        {
          label: "Distributed",
          count: counts.distributed || 0,
          value: values.distributed || 0,
          icon: <Truck size={24} />,
          color: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-100 dark:bg-purple-900/20",
        },
        {
          label: "Sold",
          count: counts.sold || 0,
          value: values.sold || 0,
          icon: <ShoppingBag size={24} />,
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
        },
        {
          label: "Returned",
          count: counts.returned || 0,
          value: values.returned || 0,
          icon: <AlertCircle size={24} />,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-100 dark:bg-orange-900/20",
        },
      ];

      setStats(statsData);
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Failed to load warehouse stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-gray-800 animate-pulse"
          >
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white dark:bg-white/5 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.count.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ₹{stat.value.toLocaleString()}
              </p>
            </div>
            <div className={`${stat.bgColor} ${stat.color} p-3 rounded-xl`}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
