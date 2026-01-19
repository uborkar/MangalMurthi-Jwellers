// GSTR-1 Summary Section Component
// Copy this entire section and paste it at line 1018 in GSTR1Report.tsx
// Place it right after line: ) : (
// And before line: {/* B2B Section */}

{/* Summary Section - TaxPower GST Format */ }
{
    activeSection === "summary" && (
        <div>
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    📊 GSTR-1 Summary - All Sections
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Consolidated view of all outward supplies | Period: {dateFrom} to {dateTo}
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-blue-600 text-white">
                        <tr className="text-center font-bold">
                            <th className="p-3 text-left sticky left-0 bg-blue-600">Particulars</th>
                            <th className="p-3">No. of<br />Records</th>
                            <th className="p-3">Invoice<br />Value (₹)</th>
                            <th className="p-3">Taxable<br />Value (₹)</th>
                            <th className="p-3">Integrated<br />Tax (₹)</th>
                            <th className="p-3">Central<br />Tax (₹)</th>
                            <th className="p-3">State/UT<br />Tax (₹)</th>
                            <th className="p-3">Cess<br />(₹)</th>
                            <th className="p-3">Total<br />(₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* B2B Row */}
                        <tr className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <td className="p-3 font-semibold">
                                <span className="text-blue-600 dark:text-blue-400">🏢</span> B2B Invoices - 4A, 4B, 4C, 6B, 6C
                            </td>
                            <td className="p-3 text-center font-mono">
                                {b2bRecords.reduce((sum, r) => sum + r.invoices.length, 0)}
                            </td>
                            <td className="p-3 text-right font-mono">
                                {b2bRecords.reduce((sum, r) => sum + r.totalValue, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono">
                                {b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.taxableValue, 0), 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-purple-600 dark:text-purple-400">
                                {b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.igstAmount, 0), 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-green-600 dark:text-green-400">
                                {b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.cgstAmount, 0), 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-orange-600 dark:text-orange-400">
                                {b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.sgstAmount, 0), 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono">0.00</td>
                            <td className="p-3 text-right font-mono font-bold">
                                {b2bRecords.reduce((sum, r) => sum + r.totalValue, 0).toFixed(2)}
                            </td>
                        </tr>

                        {/* B2CL Row */}
                        <tr className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <td className="p-3 font-semibold">
                                <span className="text-green-600 dark:text-green-400">🛍️</span> B2C Large - 5A, 5B
                            </td>
                            <td className="p-3 text-center font-mono">
                                {b2clRecords.reduce((sum, r) => sum + r.invoices.length, 0)}
                            </td>
                            <td className="p-3 text-right font-mono">
                                {b2clRecords.reduce((sum, r) => sum + r.totalValue, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono">
                                {b2clRecords.reduce((sum, r) => sum + r.totalValue, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-purple-600 dark:text-purple-400">
                                {b2clRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.igstAmount, 0), 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-right font-mono">0.00</td>
                            <td className="p-3 text-right font-mono font-bold">
                                {(b2clRecords.reduce((sum, r) => sum + r.totalValue, 0) +
                                    b2clRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.igstAmount, 0), 0)).toFixed(2)}
                            </td>
                        </tr>

                        {/* B2CS Row */}
                        <tr className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <td className="p-3 font-semibold">
                                <span className="text-amber-600 dark:text-amber-400">📦</span> B2C Small - 7
                            </td>
                            <td className="p-3 text-center font-mono">
                                {b2csRecords.length}
                            </td>
                            <td className="p-3 text-right font-mono">
                                {b2csRecords.reduce((sum, r) => sum + r.taxableValue + r.cgst + r.sgst + r.igst, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono">
                                {b2csRecords.reduce((sum, r) => sum + r.taxableValue, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-purple-600 dark:text-purple-400">
                                {b2csRecords.reduce((sum, r) => sum + r.igst, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-green-600 dark:text-green-400">
                                {b2csRecords.reduce((sum, r) => sum + r.cgst, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-orange-600 dark:text-orange-400">
                                {b2csRecords.reduce((sum, r) => sum + r.sgst, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono">0.00</td>
                            <td className="p-3 text-right font-mono font-bold">
                                {b2csRecords.reduce((sum, r) => sum + r.taxableValue + r.cgst + r.sgst + r.igst, 0).toFixed(2)}
                            </td>
                        </tr>

                        {/* HSN Summary Row */}
                        <tr className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <td className="p-3 font-semibold">
                                <span className="text-indigo-600 dark:text-indigo-400">📋</span> HSN Summary - 12
                            </td>
                            <td className="p-3 text-center font-mono">
                                {hsnSummary.length}
                            </td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-right font-mono">
                                {hsnSummary.reduce((sum, h) => sum + h.taxableValue, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-purple-600 dark:text-purple-400">
                                {hsnSummary.reduce((sum, h) => sum + h.igst, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-green-600 dark:text-green-400">
                                {hsnSummary.reduce((sum, h) => sum + h.cgst, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-orange-600 dark:text-orange-400">
                                {hsnSummary.reduce((sum, h) => sum + h.sgst, 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono">0.00</td>
                            <td className="p-3 text-right font-mono font-bold">
                                {hsnSummary.reduce((sum, h) => sum + h.taxableValue + h.cgst + h.sgst + h.igst, 0).toFixed(2)}
                            </td>
                        </tr>

                        {/* Document Summary Row */}
                        <tr className="border-b-2 border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <td className="p-3 font-semibold">
                                <span className="text-gray-600 dark:text-gray-400">📄</span> Document Summary - 13
                            </td>
                            <td className="p-3 text-center font-mono">
                                {allRecords.length}
                            </td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-center text-gray-400">-</td>
                            <td className="p-3 text-center text-gray-400">-</td>
                        </tr>

                        {/* Grand Total Row */}
                        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold">
                            <td className="p-4 text-lg">GRAND TOTAL</td>
                            <td className="p-4 text-center font-mono">
                                {allRecords.length}
                            </td>
                            <td className="p-4 text-right font-mono text-lg">
                                {(gstSummary?.totalInvoiceValue || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono text-lg">
                                {(gstSummary?.totalTaxableValue || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono text-lg">
                                {(gstSummary?.totalIGST || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono text-lg">
                                {(gstSummary?.totalCGST || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono text-lg">
                                {(gstSummary?.totalSGST || 0).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono">0.00</td>
                            <td className="p-4 text-right font-mono text-xl">
                                {(gstSummary?.totalInvoiceValue || 0).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary Notes */}
            <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">📌 Note:</span> This is a consolidated summary of all GSTR-1 sections.
                    Click on individual tabs above to view detailed records for each section.
                    All values include applicable GST as per the current rates.
                </p>
            </div>
        </div>
    )
}
