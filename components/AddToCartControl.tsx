import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { ProductStats } from '../types';

interface AddToCartControlProps {
    product: ProductStats;
    initialQuantity?: number;
    onAdd: (product: ProductStats, quantity: number) => void;
    compact?: boolean;
}

const AddToCartControl: React.FC<AddToCartControlProps> = ({
    product,
    initialQuantity = 1,
    onAdd,
    compact = false
}) => {
    const [quantity, setQuantity] = useState(initialQuantity);

    // Reset quantity if initialQuantity changes substantially (e.g. new recommendation)
    // but don't override user input if they are typing
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

    const handleInputClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

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
                        ? 'p-1 bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 gap-1'
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
