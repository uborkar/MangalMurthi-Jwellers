// Enhanced Dropdown with Add/Delete functionality for Salesperson management
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

interface Props {
    options: Array<{ id: string; name: string }>;
    value: string;
    onChange: (value: string) => void;
    onAdd?: (newValue: string) => void;
    onDelete?: (id: string, name: string) => void;
    placeholder?: string;
    addNewPlaceholder?: string;
    allowDelete?: boolean;
}

export default function SalespersonDropdown({
    options,
    value,
    onChange,
    onAdd,
    onDelete,
    placeholder = "Select...",
    addNewPlaceholder = "Add new...",
    allowDelete = true,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [showAddInput, setShowAddInput] = useState(false);
    const [newValue, setNewValue] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowAddInput(false);
                setNewValue("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionName: string) => {
        onChange(optionName);
        // Don't close immediately to prevent flicker
        setTimeout(() => setIsOpen(false), 100);
    };

    const handleAddNew = async () => {
        if (newValue.trim() && onAdd) {
            await onAdd(newValue.trim());
            setNewValue("");
            setShowAddInput(false);
            // Keep dropdown open briefly to show the new item was added
            setTimeout(() => setIsOpen(false), 300);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (onDelete && window.confirm(`Are you sure you want to remove "${name}"?`)) {
            await onDelete(id, name);
            // Dropdown will stay open to show the updated list
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Dropdown Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-3 py-2 text-left text-gray-800 dark:text-white/90 hover:border-primary focus:border-primary focus:outline-none transition-colors"
            >
                <span className={value ? "text-gray-800 dark:text-white/90 font-medium" : "text-gray-400"}>
                    {value || placeholder}
                </span>
                <ChevronDown
                    size={18}
                    className={`text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl max-h-64 overflow-y-auto">
                    {/* Options List */}
                    <div className="py-1">
                        {options.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                No salespersons yet. Add one below!
                            </div>
                        ) : (
                            options.map((option) => (
                                <div
                                    key={option.id}
                                    className={`flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer group transition-colors ${value === option.name ? "bg-blue-100 dark:bg-blue-900/30" : ""
                                        }`}
                                >
                                    <div
                                        onClick={() => handleSelect(option.name)}
                                        className="flex-1 text-sm font-medium text-gray-800 dark:text-white/90"
                                    >
                                        {option.name}
                                        {value === option.name && (
                                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">✓ Selected</span>
                                        )}
                                    </div>
                                    {allowDelete && onDelete && (
                                        <button
                                            onClick={(e) => handleDelete(e, option.id, option.name)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-all ml-2"
                                            title="Delete this salesperson"
                                        >
                                            <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add New Section */}
                    {onAdd && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50">
                            {!showAddInput ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAddInput(true)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-dashed border-blue-300 dark:border-blue-700"
                                >
                                    <Plus size={16} />
                                    {addNewPlaceholder}
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAddNew();
                                            if (e.key === "Escape") {
                                                setShowAddInput(false);
                                                setNewValue("");
                                            }
                                        }}
                                        placeholder="Enter salesperson name..."
                                        autoFocus
                                        className="w-full px-3 py-2 text-sm rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleAddNew}
                                            disabled={!newValue.trim()}
                                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                                        >
                                            ✓ Add
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddInput(false);
                                                setNewValue("");
                                            }}
                                            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
