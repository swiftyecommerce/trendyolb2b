import React, { useState } from 'react';
import {
    TrendingDown, TrendingUp, Minus, Package,
    X, Eye, ShoppingCart, Target, ChevronRight,
    Calendar, DollarSign
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '../lib/excelParser';
import type { AnalysisType, ComparisonPeriod } from '../types';

// ============================================
// PRODUCT COMPARISON INTERFACE
// ============================================

export interface ProductComparison {
    modelKodu: string;
    productName: string;
    imageUrl?: string;
    category?: string;

    // Comparison values
    oldValue: number;
    newValue: number;
    changePercent: number;
    changeType: 'increase' | 'decrease' | 'stable';

    // Impact
    impactAmount: number;  // Kayıp veya potansiyel
    impactType: 'loss' | 'gain' | 'neutral';

    // Additional metrics for detail view
    oldImpressions?: number;
    newImpressions?: number;
    oldQuantity?: number;
    newQuantity?: number;
    currentStock?: number;
    segment?: 'A' | 'B' | 'C';
}

// ============================================
// COMPARISON TABLE PROPS
// ============================================

interface ComparisonTableProps {
    title: string;
    description?: string;
    analysisType: AnalysisType;
    products: ProductComparison[];
    oldPeriodLabel: string;  // "Ocak 2025"
    newPeriodLabel: string;  // "Ocak 2026"
    showImpact?: boolean;
    impactLabel?: string;    // "Kayıp Ciro" veya "Potansiyel Ciro"
    onProductClick?: (product: ProductComparison) => void;
}

// ============================================
// PERIOD LABELS
// ============================================

export const PERIOD_LABELS: Record<ComparisonPeriod, { old: string; new: string }> = {
    'yoy': { old: 'Geçen Yıl', new: 'Bu Yıl' },
    'mom': { old: 'Geçen Ay', new: 'Bu Ay' },
    '7d_vs_30d': { old: 'Son 30 Gün Ort.', new: 'Son 7 Gün' },
    '1d_vs_7d': { old: 'Son 7 Gün Ort.', new: 'Dün' }
};

// ============================================
// PRODUCT IMAGE COMPONENT
// ============================================

const ProductImage: React.FC<{ src?: string; name: string; size?: 'sm' | 'md' }> = ({
    src, name, size = 'sm'
}) => {
    const sizeClasses = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';

    if (!src) {
        return (
            <div className={`${sizeClasses} bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Package className="w-5 h-5 text-slate-400" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className={`${sizeClasses} object-cover rounded-lg flex-shrink-0`}
            onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
            }}
        />
    );
};

// ============================================
// CHANGE INDICATOR
// ============================================

const ChangeIndicator: React.FC<{
    changePercent: number;
    changeType: 'increase' | 'decrease' | 'stable';
    size?: 'sm' | 'md';
}> = ({ changePercent, changeType, size = 'sm' }) => {
    const sizeClasses = size === 'sm' ? 'text-sm' : 'text-base font-semibold';

    if (changeType === 'stable') {
        return (
            <span className={`flex items-center gap-1 text-slate-500 ${sizeClasses}`}>
                <Minus className="w-4 h-4" />
                {formatPercent(Math.abs(changePercent))}
            </span>
        );
    }

    if (changeType === 'increase') {
        return (
            <span className={`flex items-center gap-1 text-emerald-600 ${sizeClasses}`}>
                <TrendingUp className="w-4 h-4" />
                +{formatPercent(Math.abs(changePercent))}
            </span>
        );
    }

    return (
        <span className={`flex items-center gap-1 text-red-600 ${sizeClasses}`}>
            <TrendingDown className="w-4 h-4" />
            {formatPercent(Math.abs(changePercent))}
        </span>
    );
};

// ============================================
// COMPARISON TABLE COMPONENT
// ============================================

const ComparisonTable: React.FC<ComparisonTableProps> = ({
    title,
    description,
    analysisType,
    products,
    oldPeriodLabel,
    newPeriodLabel,
    showImpact = true,
    impactLabel = 'Etki',
    onProductClick
}) => {
    const [selectedProduct, setSelectedProduct] = useState<ProductComparison | null>(null);

    // Calculate totals
    const totalOld = products.reduce((sum, p) => sum + p.oldValue, 0);
    const totalNew = products.reduce((sum, p) => sum + p.newValue, 0);
    const totalChange = totalOld > 0 ? ((totalNew - totalOld) / totalOld) * 100 : 0;
    const totalImpact = products.reduce((sum, p) => sum + Math.abs(p.impactAmount), 0);

    const handleProductClick = (product: ProductComparison) => {
        if (onProductClick) {
            onProductClick(product);
        } else {
            setSelectedProduct(product);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    {description && (
                        <p className="text-sm text-slate-500 mt-1">{description}</p>
                    )}
                </div>

                {/* Summary Stats */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                        <p className="text-slate-500">{products.length} ürün</p>
                        <ChangeIndicator
                            changePercent={totalChange}
                            changeType={totalChange > 5 ? 'increase' : totalChange < -5 ? 'decrease' : 'stable'}
                        />
                    </div>
                    {showImpact && (
                        <div className="text-right">
                            <p className="text-slate-500">{impactLabel}</p>
                            <p className={`font-bold ${totalNew > totalOld ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(totalImpact)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-300">
                        <tr>
                            <th className="text-left p-4 text-xs font-semibold text-slate-500 w-16 border-r border-slate-200">Görsel</th>
                            <th className="text-left p-4 text-xs font-semibold text-slate-500 border-r border-slate-200">Ürün</th>
                            <th className="text-right p-4 text-xs font-semibold text-slate-500 border-r border-slate-200">
                                <div className="flex items-center justify-end gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {oldPeriodLabel}
                                </div>
                            </th>
                            <th className="text-right p-4 text-xs font-semibold text-slate-500 border-r border-slate-200">
                                <div className="flex items-center justify-end gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {newPeriodLabel}
                                </div>
                            </th>
                            <th className="text-right p-4 text-xs font-semibold text-slate-500 border-r border-slate-200">Değişim</th>
                            {showImpact && (
                                <th className="text-right p-4 text-xs font-semibold text-slate-500">{impactLabel}</th>
                            )}
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {products.map((product, idx) => (
                            <tr
                                key={product.modelKodu}
                                onClick={() => handleProductClick(product)}
                                className={`border-t border-slate-100 cursor-pointer transition-colors hover:bg-indigo-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                    } ${product.impactType === 'loss' ? '!bg-red-50/30' :
                                        product.impactType === 'gain' ? '!bg-emerald-50/30' : ''
                                    }`}
                            >
                                <td className="p-4 border-r border-slate-100">
                                    <ProductImage src={product.imageUrl} name={product.productName} />
                                </td>
                                <td className="p-4 border-r border-slate-100">
                                    <div>
                                        <p className="font-medium text-slate-900 truncate max-w-[200px]">
                                            {product.productName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-500">{product.modelKodu}</span>
                                            {product.segment && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${product.segment === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                                    product.segment === 'B' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    Segment {product.segment}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right border-r border-slate-100">
                                    <span className="text-slate-600">{formatCurrency(product.oldValue)}</span>
                                </td>
                                <td className="p-4 text-right border-r border-slate-100">
                                    <span className="font-medium text-slate-900">{formatCurrency(product.newValue)}</span>
                                </td>
                                <td className="p-4 text-right border-r border-slate-100">
                                    <ChangeIndicator
                                        changePercent={product.changePercent}
                                        changeType={product.changeType}
                                    />
                                </td>
                                {showImpact && (
                                    <td className="p-4 text-right">
                                        <span className={`font-semibold ${product.impactType === 'loss' ? 'text-red-600' :
                                            product.impactType === 'gain' ? 'text-emerald-600' :
                                                'text-slate-600'
                                            }`}>
                                            {product.impactType === 'loss' ? '-' : '+'}{formatCurrency(Math.abs(product.impactAmount))}
                                        </span>
                                    </td>
                                )}
                                <td className="p-4">
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {products.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        Bu kriterlere uyan ürün bulunamadı
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedProduct && (
                <ProductComparisonModal
                    product={selectedProduct}
                    oldPeriodLabel={oldPeriodLabel}
                    newPeriodLabel={newPeriodLabel}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </div>
    );
};

// ============================================
// PRODUCT COMPARISON DETAIL MODAL
// ============================================

interface ProductComparisonModalProps {
    product: ProductComparison;
    oldPeriodLabel: string;
    newPeriodLabel: string;
    onClose: () => void;
}

const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
    product,
    oldPeriodLabel,
    newPeriodLabel,
    onClose
}) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-900">Ürün Karşılaştırma</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Product Info */}
                    <div className="flex gap-4">
                        <ProductImage src={product.imageUrl} name={product.productName} size="md" />
                        <div>
                            <h4 className="font-semibold text-slate-900">{product.productName}</h4>
                            <p className="text-sm text-slate-500">{product.modelKodu}</p>
                            {product.category && (
                                <p className="text-xs text-slate-400 mt-1">{product.category}</p>
                            )}
                        </div>
                    </div>

                    {/* Main Comparison */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">{oldPeriodLabel}</p>
                                <p className="text-xl font-bold text-slate-700">{formatCurrency(product.oldValue)}</p>
                            </div>
                            <div className="flex items-center justify-center">
                                <ChangeIndicator
                                    changePercent={product.changePercent}
                                    changeType={product.changeType}
                                    size="md"
                                />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">{newPeriodLabel}</p>
                                <p className="text-xl font-bold text-slate-900">{formatCurrency(product.newValue)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Impact */}
                    <div className={`rounded-xl p-4 ${product.impactType === 'loss' ? 'bg-red-50 border border-red-200' :
                        product.impactType === 'gain' ? 'bg-emerald-50 border border-emerald-200' :
                            'bg-slate-50 border border-slate-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${product.impactType === 'loss' ? 'text-red-700' :
                                product.impactType === 'gain' ? 'text-emerald-700' :
                                    'text-slate-700'
                                }`}>
                                {product.impactType === 'loss' ? 'Tahmini Kayıp' :
                                    product.impactType === 'gain' ? 'Potansiyel Kazanç' : 'Etki'}
                            </span>
                            <span className={`text-lg font-bold ${product.impactType === 'loss' ? 'text-red-700' :
                                product.impactType === 'gain' ? 'text-emerald-700' :
                                    'text-slate-700'
                                }`}>
                                {formatCurrency(Math.abs(product.impactAmount))}
                            </span>
                        </div>
                    </div>

                    {/* Additional Metrics */}
                    {(product.oldQuantity !== undefined || product.oldImpressions !== undefined) && (
                        <div className="space-y-3">
                            <h5 className="text-sm font-semibold text-slate-700">Detaylı Metrikler</h5>
                            <div className="grid grid-cols-2 gap-3">
                                {product.oldQuantity !== undefined && product.newQuantity !== undefined && (
                                    <MetricComparison
                                        label="Satış Adedi"
                                        icon={Target}
                                        oldValue={product.oldQuantity}
                                        newValue={product.newQuantity}
                                        format="number"
                                    />
                                )}
                                {product.oldImpressions !== undefined && product.newImpressions !== undefined && (
                                    <MetricComparison
                                        label="Görüntülenme"
                                        icon={Eye}
                                        oldValue={product.oldImpressions}
                                        newValue={product.newImpressions}
                                        format="number"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Stock Info */}
                    {product.currentStock !== undefined && (
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-600">Mevcut Stok</span>
                            <span className={`font-semibold ${product.currentStock < 10 ? 'text-red-600' : 'text-slate-900'
                                }`}>
                                {formatNumber(product.currentStock)} adet
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================
// METRIC COMPARISON HELPER
// ============================================

interface MetricComparisonProps {
    label: string;
    icon: React.FC<any>;
    oldValue: number;
    newValue: number;
    format: 'currency' | 'number' | 'percent';
}

const MetricComparison: React.FC<MetricComparisonProps> = ({
    label, icon: Icon, oldValue, newValue, format
}) => {
    const changePercent = oldValue > 0 ? ((newValue - oldValue) / oldValue) * 100 : 0;
    const formatValue = (v: number) => {
        switch (format) {
            case 'currency': return formatCurrency(v);
            case 'percent': return formatPercent(v);
            default: return formatNumber(v);
        }
    };

    return (
        <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600">{label}</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{formatValue(oldValue)}</span>
                <span className="text-xs text-slate-400">→</span>
                <span className="text-sm font-medium text-slate-900">{formatValue(newValue)}</span>
            </div>
            <div className="mt-1 text-right">
                <span className={`text-xs ${changePercent > 5 ? 'text-emerald-600' :
                    changePercent < -5 ? 'text-red-600' :
                        'text-slate-500'
                    }`}>
                    {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                </span>
            </div>
        </div>
    );
};

export default ComparisonTable;
