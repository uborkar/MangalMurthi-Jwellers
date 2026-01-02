// src/components/warehouse/QuickActions.tsx - Quick action buttons for warehouse
import { useNavigate } from "react-router-dom";
import { Package, CheckCircle, Truck, FileText } from "lucide-react";

interface ActionButton {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

export default function QuickActions() {
  const navigate = useNavigate();

  const actions: ActionButton[] = [
    {
      label: "Tagging",
      description: "Generate new barcodes",
      icon: <Package size={20} />,
      path: "/warehouse/tagging",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
    },
    {
      label: "Stock In",
      description: "Receive printed items",
      icon: <CheckCircle size={20} />,
      path: "/warehouse/stock-in",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
    },
    {
      label: "Distribution",
      description: "Send to shops",
      icon: <Truck size={20} />,
      path: "/warehouse/distribution",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30",
    },
    {
      label: "Reports",
      description: "View analytics",
      icon: <FileText size={20} />,
      path: "/warehouse/reports",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => navigate(action.path)}
          className={`${action.bgColor} border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-left transition-all hover:shadow-md`}
        >
          <div className={`${action.color} mb-3`}>{action.icon}</div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {action.label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {action.description}
          </p>
        </button>
      ))}
    </div>
  );
}
