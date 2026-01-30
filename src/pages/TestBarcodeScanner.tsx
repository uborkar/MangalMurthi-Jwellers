// src/pages/TestBarcodeScanner.tsx - Test page for barcode scanner
import { useState } from "react";
import TASection from "../components/common/TASection";
import PageMeta from "../components/common/PageMeta";
import BarcodeView from "../components/common/BarcodeView";
import BarcodeScanner from "../components/common/BarcodeScanner";
import toast from "react-hot-toast";
import { Check, X, Scan, Printer } from "lucide-react";

export default function TestBarcodeScanner() {
    const [scannedCodes, setScannedCodes] = useState<string[]>([]);
    const [scanMode, setScanMode] = useState(true);

    // Sample test barcodes (already in your system)
    const testBarcodes = [
        "MG-RNG-MAL-25-000001",
        "MG-RNG-MAL-25-000002",
        "MG-NCK-PUN-25-000001",
        "MG-BRC-SAN-25-000001",
        "MG-EAR-MUM-25-000001",
    ];

    const handleScan = (barcode: string) => {
        setScannedCodes(prev => [barcode, ...prev].slice(0, 20));
        toast.success(`✅ Scanned: ${barcode}`);
    };

    const clearHistory = () => {
        setScannedCodes([]);
        toast.success("History cleared");
    };

    const testPrint = () => {
        window.print();
    };

    return (
        <>
            <PageMeta title="Barcode Scanner Test" description="Test your wireless barcode scanner" />

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    <TASection
                        title="🔍 Barcode Scanner Test Page"
                        subtitle="Test your wireless barcode gun scanner"
                    >
                        {/* Scanner Status */}
                        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                        <Scan size={20} />
                                        Scanner Mode: {scanMode ? "🟢 ACTIVE" : "🔴 OFF"}
                                    </h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        {scanMode ? "Point scanner at barcodes below and scan" : "Enable scanner to start testing"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setScanMode(!scanMode)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${scanMode
                                        ? "bg-green-500 hover:bg-green-600 text-white"
                                        : "bg-gray-300 hover:bg-gray-400 text-gray-700"
                                        }`}
                                >
                                    {scanMode ? "✓ Scanner ON" : "Enable Scanner"}
                                </button>
                            </div>

                            {scanMode && (
                                <BarcodeScanner
                                    onScan={handleScan}
                                    placeholder="Focus here and scan barcodes..."
                                    disabled={!scanMode}
                                />
                            )}
                        </div>

                        {/* Test Barcodes - Print These! */}
                        <div className="mb-6 p-5 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-yellow-900 dark:text-yellow-100">
                                    📋 Test Barcodes (Print These)
                                </h3>
                                <button
                                    onClick={testPrint}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
                                >
                                    <Printer size={16} />
                                    Print This Page
                                </button>
                            </div>

                            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                                🎯 <strong>How to test:</strong>
                                <br />1. Click "Print This Page" button
                                <br />2. Print on A4 paper
                                <br />3. Cut out barcodes
                                <br />4. Scan them with your wireless scanner gun
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {testBarcodes.map((barcode, index) => (
                                    <div
                                        key={index}
                                        className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-700 print:border-black print:break-inside-avoid"
                                    >
                                        <div className="text-center mb-2">
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                Test Barcode #{index + 1}
                                            </span>
                                        </div>
                                        <div className="flex justify-center items-center bg-white p-3 rounded">
                                            <BarcodeView value={barcode} height={60} />
                                        </div>
                                        <div className="text-center mt-2">
                                            <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                                                {barcode}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scan History */}
                        <div className="p-5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                    ✅ Scan History ({scannedCodes.length})
                                </h3>
                                {scannedCodes.length > 0 && (
                                    <button
                                        onClick={clearHistory}
                                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                                    >
                                        Clear History
                                    </button>
                                )}
                            </div>

                            {scannedCodes.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <Scan size={48} className="mx-auto mb-3 opacity-30" />
                                    <p>No scans yet. Start scanning barcodes!</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {scannedCodes.map((code, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Check size={20} className="text-green-600 dark:text-green-400" />
                                                <span className="font-mono font-bold text-green-700 dark:text-green-300">
                                                    {code}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date().toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Instructions */}
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                📖 Scanner Testing Instructions:
                            </h4>
                            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4">
                                <li>1. Turn on your wireless barcode scanner gun</li>
                                <li>2. Ensure it's connected (USB/Bluetooth)</li>
                                <li>3. Click in the scanner input field above (or it auto-focuses)</li>
                                <li>4. Point scanner at printed barcodes and press trigger</li>
                                <li>5. Check if barcode appears in "Scan History" below</li>
                                <li>6. If it works ✅ - Scanner is configured correctly!</li>
                                <li>7. If not ❌ - Check scanner mode (keyboard emulation mode required)</li>
                            </ol>
                        </div>

                        {/* Troubleshooting */}
                        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                                ⚠️ Scanner Not Working? Troubleshooting:
                            </h4>
                            <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1 ml-4">
                                <li>• Check scanner battery / power</li>
                                <li>• Verify USB/Bluetooth connection</li>
                                <li>• Scanner must be in "Keyboard Emulation" mode (not storage mode)</li>
                                <li>• Try scanning into Notepad first to verify scanner works</li>
                                <li>• Check if scanner adds Enter key after barcode (recommended)</li>
                                <li>• Ensure barcode is clear and not damaged</li>
                                <li>• Distance: Hold scanner 5-15cm from barcode</li>
                            </ul>
                        </div>
                    </TASection>
                </div>
            </div>


        </>
    );
}

