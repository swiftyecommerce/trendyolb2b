import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface CategoryMultiSelectProps {
    categories: string[];
    selectedCategories: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

const CategoryMultiSelect: React.FC<CategoryMultiSelectProps> = ({
    categories,
    selectedCategories,
    onChange,
    placeholder = 'Kategoriler'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allSelected = selectedCategories.length === categories.length;
    const noneSelected = selectedCategories.length === 0;

    const toggleCategory = (category: string) => {
        if (selectedCategories.includes(category)) {
            onChange(selectedCategories.filter(c => c !== category));
        } else {
            onChange([...selectedCategories, category]);
        }
    };

    const selectAll = () => onChange([...categories]);
    const clearAll = () => onChange([]);

    const getDisplayText = () => {
        if (allSelected || noneSelected) return 'Tüm Kategoriler';
        if (selectedCategories.length === 1) return selectedCategories[0];
        return `${selectedCategories.length} kategori seçili`;
    };

    const excludedCount = categories.length - selectedCategories.length;

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm transition-all ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
                    }`}
            >
                <span className={excludedCount > 0 ? 'text-indigo-600 font-medium' : 'text-slate-700'}>
                    {getDisplayText()}
                </span>
                {excludedCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                        -{excludedCount}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <button
                            onClick={selectAll}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            Tümünü Seç
                        </button>
                        <button
                            onClick={clearAll}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                        >
                            Tümünü Kaldır
                        </button>
                    </div>

                    {/* Category List */}
                    <div className="max-h-64 overflow-y-auto">
                        {categories.map(category => {
                            const isSelected = selectedCategories.includes(category);
                            return (
                                <button
                                    key={category}
                                    onClick={() => toggleCategory(category)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${isSelected
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'border-slate-300'
                                        }`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="truncate">{category}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    {excludedCount > 0 && (
                        <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                            {excludedCount} kategori hariç tutuluyor
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CategoryMultiSelect;
