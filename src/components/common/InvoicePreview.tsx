// src/components/common/InvoicePreview.tsx - Invoice/Booking Preview Modal
import { X, Printer } from "lucide-react";

interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  title: string;
  children: React.ReactNode;
}

export default function InvoicePreview({
  isOpen,
  onClose,
  onPrint,
  title,
  children,
}: InvoicePreviewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onPrint}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Printer size={20} />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-[210mm] mx-auto">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Preview before printing
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={onPrint}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Printer size={18} />
              Print Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
