// Custom Dropdown with Add New functionality
// Matches project theme: rounded-xl borders, proper dark mode, brand colors

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";

interface CustomDropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    onAddNew?: (newValue: string) => void;
    placeholder?: string;
    addNewPlaceholder?: string;
    className?: string;
    disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
    options,
    value,
    onChange,
    onAddNew,
    placeholder = "Select...",
    addNewPlaceholder = "Add new...",
    className = "",
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newItemValue, setNewItemValue] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setNewItemValue("");
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle selecting an option
    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
        setNewItemValue("");
    };

    // Handle adding new item
    const handleAddNew = () => {
        if (newItemValue.trim() && onAddNew) {
            onAddNew(newItemValue.trim());
            onChange(newItemValue.trim());
            setNewItemValue("");
            setIsOpen(false);
        }
    };

    // Handle Enter key in input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddNew();
        }
        if (e.key === "Escape") {
            setIsOpen(false);
            setNewItemValue("");
        }
    };

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button - Theme-matched rounded input style */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    flex items-center justify-between gap-2 
                    px-4 py-2.5 w-full
                    rounded-xl
                    border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-white/[0.03]
                    text-sm font-medium
                    text-gray-800 dark:text-white/90
                    shadow-sm
                    transition-all duration-200
                    hover:border-gray-300 dark:hover:border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800
                `}
            >
                <span className={`truncate ${!value ? "text-gray-400 dark:text-gray-500" : ""}`}>
                    {value || placeholder}
                </span>
                <ChevronDown
                    size={18}
                    className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="
                        absolute z-50 mt-2 
                        w-full min-w-[200px]
                        bg-white dark:bg-gray-800/95 
                        backdrop-blur-lg
                        rounded-xl 
                        shadow-xl shadow-black/10 dark:shadow-black/40
                        border border-gray-200 dark:border-gray-700
                        py-1.5
                        overflow-hidden
                    "
                    style={{
                        animation: "dropdownFadeIn 0.15s ease-out",
                    }}
                >
                    {/* Options List */}
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                        {options.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center italic">
                                No options available
                            </div>
                        ) : (
                            options.map((option, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`
                                        w-full px-4 py-2.5 
                                        flex items-center justify-between gap-2
                                        text-left text-sm
                                        transition-all duration-150
                                        ${value === option
                                            ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"
                                        }
                                    `}
                                >
                                    <span className="truncate">{option}</span>
                                    {value === option && (
                                        <Check size={16} className="text-brand-500 dark:text-brand-400 flex-shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Add New Section */}
                    {onAddNew && (
                        <>
                            <div className="mx-3 my-1.5 border-t border-gray-100 dark:border-gray-700" />

                            <div className="px-3 pb-1.5">
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newItemValue}
                                        onChange={(e) => setNewItemValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={addNewPlaceholder}
                                        className="
                                            flex-1 px-3 py-2
                                            text-sm text-gray-700 dark:text-gray-200
                                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                                            bg-transparent
                                            border-none outline-none
                                        "
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddNew}
                                        disabled={!newItemValue.trim()}
                                        className={`
                                            p-2 mr-1 rounded-lg
                                            transition-all duration-200
                                            ${newItemValue.trim()
                                                ? "text-white bg-brand-500 hover:bg-brand-600 shadow-sm cursor-pointer"
                                                : "text-gray-400 dark:text-gray-600 bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                                            }
                                        `}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Animation keyframes */}
            <style>{`
                @keyframes dropdownFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-8px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
};

export default CustomDropdown;
