// src/components/common/BarcodeScanner.tsx - Barcode Scanner Component

import { useState } from "react";
import { Scan, X, CheckCircle } from "lucide-react";
import { useBarcodeScanner, useManualBarcodeInput } from "../../hooks/useBarcodeScanner";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showLastScanned?: boolean;
  className?: string;
}

/**
 * Barcode Scanner Component
 * 
 * Supports both USB barcode scanner and manual keyboard input.
 * USB scanners send keystrokes very quickly followed by Enter.
 * 
 * @example
 * ```tsx
 * <BarcodeScanner
 *   onScan={(barcode) => {
 *     console.log('Scanned:', barcode);
 *     // Add item to list
 *   }}
 *   placeholder="Scan barcode or type manually..."
 * />
 * ```
 */
export default function BarcodeScanner({
  onScan,
  onError,
  placeholder = "Scan barcode or type manually...",
  disabled = false,
  autoFocus = true,
  showLastScanned = true,
  className = "",
}: BarcodeScannerProps) {
  const { value, setValue, lastScanned, handleScan, clear } = useManualBarcodeInput();
  const [error, setError] = useState<string>("");

  // USB Scanner integration
  const { isScanning } = useBarcodeScanner({
    onScan: (barcode) => {
      handleScan(barcode);
      onScan(barcode);
      setError("");
    },
    onError: (err) => {
      setError(err);
      onError?.(err);
    },
    enabled: !disabled,
  });

  // Manual input submit
  const handleManualSubmit = () => {
    const trimmed = value.trim();

    if (!trimmed) {
      setError("Please enter a barcode");
      return;
    }

    if (trimmed.length < 5) {
      setError("Barcode too short (minimum 5 characters)");
      return;
    }

    handleScan(trimmed);
    onScan(trimmed);
    setError("");
  };

  // Handle Enter key in manual input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Input Field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* Scanner Icon */}
          <Scan
            className={`absolute left-3 top-2.5 transition-colors ${
              isScanning
                ? "text-green-500 animate-pulse"
                : "text-gray-400 dark:text-gray-500"
            }`}
            size={18}
          />

          {/* Input */}
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`pl-10 pr-10 w-full rounded-xl border ${
              error
                ? "border-red-300 dark:border-red-700 focus:border-red-500"
                : "border-gray-200 dark:border-gray-800 focus:border-primary"
            } bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          />

          {/* Clear Button */}
          {value && (
            <button
              onClick={() => {
                clear();
                setError("");
              }}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleManualSubmit}
          disabled={disabled || !value.trim()}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          Add
        </button>
      </div>

      {/* Status Messages */}
      <div className="min-h-[24px]">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Last Scanned (Success) */}
        {!error && showLastScanned && lastScanned && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300 animate-fade-in">
            <CheckCircle size={16} />
            <span>
              ✅ Scanned: <span className="font-mono font-bold">{lastScanned}</span>
            </span>
          </div>
        )}

        {/* Scanning Indicator */}
        {isScanning && !lastScanned && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-300">
            <Scan size={16} className="animate-pulse" />
            <span>Scanning...</span>
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        💡 Use a USB barcode scanner or type manually and press Enter
      </p>
    </div>
  );
}

/**
 * Compact Barcode Scanner (for inline use)
 */
export function CompactBarcodeScanner({
  onScan,
  placeholder = "Scan...",
  disabled = false,
}: Pick<BarcodeScannerProps, "onScan" | "placeholder" | "disabled">) {
  const { value, setValue, handleScan } = useManualBarcodeInput();

  useBarcodeScanner({
    onScan: (barcode) => {
      handleScan(barcode);
      onScan(barcode);
    },
    enabled: !disabled,
  });

  const handleSubmit = () => {
    if (value.trim()) {
      handleScan(value.trim());
      onScan(value.trim());
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Scan className="absolute left-2 top-2 text-gray-400" size={16} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-8 w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-2 py-1.5 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-primary"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        type="button"
      >
        Add
      </button>
    </div>
  );
}
