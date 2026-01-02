// src/pages/Warehouse/Returns.tsx - Returns Information Page
import { useNavigate } from "react-router";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import { ArrowLeft, Package } from "lucide-react";

export default function Returns() {
  const navigate = useNavigate();

  return (
    <>
      <PageMeta title="Returns Management" description="Manage returns and returned items" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="🔄 Returns Management"
            subtitle="Choose the type of return you want to process"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales Return */}
              <button
                onClick={() => navigate("/shops/sales-return")}
                className="p-8 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 bg-blue-50 dark:bg-blue-900/20 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <ArrowLeft className="text-blue-600 dark:text-blue-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300">
                    Process Returns
                  </h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Process customer returns and shop-to-warehouse returns
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Customer returns to shop</li>
                  <li>• Shop returns to warehouse</li>
                  <li>• Barcode scanning support</li>
                </ul>
                <div className="mt-4 text-blue-600 dark:text-blue-400 font-medium">
                  Go to Sales Return →
                </div>
              </button>

              {/* Returned Items */}
              <button
                onClick={() => navigate("/warehouse/returned-items")}
                className="p-8 rounded-xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-500 bg-purple-50 dark:bg-purple-900/20 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Package className="text-purple-600 dark:text-purple-400" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300">
                    Returned Items
                  </h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  View and manage items returned to warehouse
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• View all returned items</li>
                  <li>• Update return status</li>
                  <li>• Restock items</li>
                </ul>
                <div className="mt-4 text-purple-600 dark:text-purple-400 font-medium">
                  Go to Returned Items →
                </div>
              </button>
            </div>

            {/* Info Section */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                📋 Returns Process Overview
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Customer Returns:
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                    <li>Search invoice by ID</li>
                    <li>Select items to return</li>
                    <li>Specify return reason</li>
                    <li>Items go back to shop inventory</li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Warehouse Returns:
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                    <li>Scan item barcodes</li>
                    <li>Specify return reason</li>
                    <li>Items sent to warehouse</li>
                    <li>Warehouse receives and restocks</li>
                  </ol>
                </div>
              </div>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
}
