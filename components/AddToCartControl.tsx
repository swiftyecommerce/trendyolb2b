import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { ProductStats } from '../types';

interface AddToCartControlProps {
    product: ProductStats;
    initialQuantity?: number;
    onAdd: (product: ProductStats, quantity: number) => void;
    // New props for editing existing cart items
    currentCartQuantity?: number;
    onUpdateQuantity?: (product: ProductStats, quantity: number) => void;
    onRemove?: (product: ProductStats) => void;
    compact?: boolean;
}

const AddToCartControl: React.FC<AddToCartControlProps> = ({
    product,
    initialQuantity = 1,
    onAdd,
    currentCartQuantity = 0,
    onUpdateQuantity,
    onRemove,
    compact = false
}) => {
    const [quantity, setQuantity] = useState(initialQuantity);

    // Reset quantity if initialQuantity changes substantially (e.g. new recommendation)
    useEffect(() => {
        if (initialQuantity > 0 && Math.abs(initialQuantity - quantity) > 10) {
            setQuantity(initialQuantity);
        }
    }, [initialQuantity]);

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (quantity > 0) {
            onAdd(product, quantity);
        }
    };

    const handleUpdate = (newQty: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (onUpdateQuantity) {
            onUpdateQuantity(product, newQty);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRemove) {
            onRemove(product);
        }
    };

    const handleInputClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    // If item is in cart and we have update/remove handlers, show edit controls
    if (currentCartQuantity > 0 && onUpdateQuantity && onRemove) {
        return (
            <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                <button
                    onClick={(e) => handleUpdate(currentCartQuantity - 1, e)}
                    className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                >
                    <Minus className={compact ? "w-3 h-3" : "w-4 h-4"} />
                </button>

                <div className={`flex items-center justify-center font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg ${compact ? 'w-8 py-1' : 'w-12 py-1.5'}`}>
                    {currentCartQuantity}
                </div>

                <button
                    onClick={(e) => handleUpdate(currentCartQuantity + 1, e)}
                    className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                >
                    <Plus className={compact ? "w-3 h-3" : "w-4 h-4"} />
                </button>

                <button
                    onClick={handleRemove}
                    className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors ml-1"
                    title="Sepetten Çıkar"
                >
                    <Trash2 className={compact ? "w-3 h-3" : "w-4 h-4"} />
                </button>
            </div>
        );
    }

    // Default "Add" state
    return (
        <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
            <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                onClick={handleInputClick}
                className={`border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${compact ? 'w-12 py-1' : 'w-16 py-1.5'
                    }`}
            />
            <button
                onClick={handleAdd}
                className={`flex items-center justify-center rounded-lg transition-colors ${compact
                    ? 'p-1 bg-slate-800 text-white hover:bg-slate-700'
                    : 'px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 gap-1'
                    }`}
                title="Sepete Ekle"
            >
                <ShoppingCart className={compact ? "w-3 h-3" : "w-4 h-4"} />
                {!compact && <span>Ekle</span>}
            </button>
        </div>
    );
};

export default AddToCartControl;
