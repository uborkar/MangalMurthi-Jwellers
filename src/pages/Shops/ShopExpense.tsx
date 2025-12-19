import React, { useState } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import { Plus, Trash2 } from "lucide-react";

interface ExpenseItem {
  description: string;
  amount: number;
  remarks: string;
}

const ShopExpense: React.FC = () => {
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [items, setItems] = useState<ExpenseItem[]>([
    { description: "", amount: 0, remarks: "" },
  ]);

  const addRow = () => {
    setItems([...items, { description: "", amount: 0, remarks: "" }]);
  };

  const updateItem = <K extends keyof ExpenseItem>(
    index: number,
    field: K,
    value: ExpenseItem[K]
  ) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalExpense = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const closingBalance = openingBalance - totalExpense;

  const handleSubmit = () => {
    alert("Expenses saved (backend will be added later)");
  };

  const inputStyle =
    "w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:border-primary focus:outline-none";

  return (
    <>
      <PageMeta title="Shop Expenses" description="Daily expense tracking" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="💰 Shop Daily Expenses"
            subtitle="Track opening balance, daily expenses & closing balance"
          >
            {/* Dashboard Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">💼</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Opening Balance</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">₹{openingBalance.toLocaleString()}</h4>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">💸</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</span>
                  <h4 className="mt-2 font-bold text-red-600 text-title-sm dark:text-red-400">₹{totalExpense.toLocaleString()}</h4>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="mt-5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Closing Balance</span>
                  <h4 className="mt-2 font-bold text-green-600 text-title-sm dark:text-green-400">₹{closingBalance.toLocaleString()}</h4>
                </div>
              </div>
            </div>

            {/* -------------------- Opening Balance Input -------------------- */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] mb-6">
              <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                💼 Set Opening Balance for Today
              </label>
              <input
                type="number"
                className={inputStyle}
                placeholder="Enter Opening Balance (₹)"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
              />
            </div>

            {/* -------------------- Expense Entries -------------------- */}
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  📝 Daily Expense Entries ({items.length})
                </h2>
              </div>

              <div className="space-y-3">
                {items.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-3 items-center bg-gray-50 dark:bg-white/[0.04] p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    {/* Description */}
                    <div className="col-span-12 md:col-span-4">
                      <input
                        type="text"
                        placeholder="Expense Description"
                        className={inputStyle}
                        value={row.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                      />
                    </div>

                    {/* Amount */}
                    <div className="col-span-12 md:col-span-3">
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        className={inputStyle}
                        value={row.amount}
                        onChange={(e) =>
                          updateItem(index, "amount", Number(e.target.value))
                        }
                      />
                    </div>

                    {/* Remarks */}
                    <div className="col-span-12 md:col-span-4">
                      <input
                        type="text"
                        placeholder="Remarks"
                        className={inputStyle}
                        value={row.remarks}
                        onChange={(e) =>
                          updateItem(index, "remarks", e.target.value)
                        }
                      />
                    </div>

                    {/* Remove */}
                    <div className="col-span-12 md:col-span-1 flex justify-center">
                      <button
                        className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors dark:bg-red-600 dark:hover:bg-red-700"
                        onClick={() => removeRow(index)}
                        title="Remove expense"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Row */}
              <button
                className="mt-4 px-5 py-2.5 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
                onClick={addRow}
              >
                <Plus size={18} /> Add Expense Entry
              </button>
            </div>

            {/* -------------------- Summary Info -------------------- */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>💡 Summary:</strong> Total expenses will be deducted from opening balance to calculate closing balance. All values are updated in real-time.
              </p>
            </div>
            {/* Submit Button */}
            <div className="flex justify-end mt-6">
              <button
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors dark:bg-green-600 dark:hover:bg-green-700 flex items-center gap-2"
                onClick={handleSubmit}
              >
                <Plus size={18} />
                Save Expenses
              </button>
            </div>

          </TASection>
        </div>
      </div>
    </>
  );
};

export default ShopExpense;
