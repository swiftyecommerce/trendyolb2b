import React, { useState, useMemo } from 'react';
import {
    Package, Search, Filter, ShoppingCart, ExternalLink,
    ChevronDown, X
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatCurrency, formatNumber, formatPercent } from '../lib/excelParser';
import type { ProductStats } from '../types';

const ProductsView: React.FC = () => {
    const { state, addToCart, getStockRecommendations, settings, categories } = useAnalytics();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [segmentFilter, setSegmentFilter] = useState<'A' | 'B' | 'C' | ''>('');
    const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'stock'>('revenue');
    const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

    const stockRecommendations = useMemo(() => {
        const recs = getStockRecommendations(30);
        const map: Record<string, number> = {};
        for (const rec of recs) {
            map[rec.modelKodu] = rec.recommendedOrder;
        }
        return map;
    }, [getStockRecommendations]);

    const filteredProducts = useMemo(() => {
        let products = state.products;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            products = products.filter(p =>
                p.productName.toLowerCase().includes(term) ||
                p.modelKodu.toLowerCase().includes(term)
            );
        }

        if (categoryFilter) {
            products = products.filter(p => p.category === categoryFilter);
        }

        if (segmentFilter) {
            products = products.filter(p => p.segment === segmentFilter);
        }

        // Sort
        switch (sortBy) {
            case 'revenue':
                products = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue);
                break;
            case 'quantity':
                products = [...products].sort((a, b) => b.totalQuantity - a.totalQuantity);
                break;
            case 'stock':
                products = [...products].sort((a, b) => (a.currentStock || 999) - (b.currentStock || 999));
                break;
        }

        return products;
    }, [state.products, searchTerm, categoryFilter, segmentFilter, sortBy]);

    const handleAddToCart = (product: ProductStats) => {
        const qty = stockRecommendations[product.modelKodu] || 10;
        addToCart(product, qty);
        setAddedProducts(prev => new Set(prev).add(product.modelKodu));
        setTimeout(() => {
            setAddedProducts(prev => {
                const next = new Set(prev);
                next.delete(product.modelKodu);
                return next;
            });
        }, 2000);
    };

    const hasData = state.products.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Ürünler</h1>
                <p className="text-sm text-slate-500 mt-1">
                    {hasData ? `${formatNumber(filteredProducts.length)} ürün listeleniyor` : 'Veri yüklemek için Veri Yönetimi\'ne gidin'}
                </p>
            </div>

            {/* Filters */}
            {hasData && (
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ürün adı veya model kodu ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Tüm Kategoriler</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Segment Filter */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {(['', 'A', 'B', 'C'] as const).map(seg => (
                            <button
                                key={seg}
                                onClick={() => setSegmentFilter(seg)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${segmentFilter === seg
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {seg === '' ? 'Tümü' : `Seg ${seg}`}
                            </button>
                        ))}
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="revenue">Ciroya Göre</option>
                            <option value="quantity">Satışa Göre</option>
                            <option value="stock">Stoka Göre</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            )}

            {/* Products Table */}
            {hasData ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left p-4 text-sm font-semibold text-slate-600">Görsel</th>
                                <th className="text-left p-4 text-sm font-semibold text-slate-600">Ürün</th>
                                <th className="text-center p-4 text-sm font-semibold text-slate-600">Segment</th>
                                <th className="text-right p-4 text-sm font-semibold text-slate-600">Stok</th>
                                <th className="text-right p-4 text-sm font-semibold text-slate-600">Satış (30g)</th>
                                <th className="text-right p-4 text-sm font-semibold text-slate-600">Ciro</th>
                                <th className="text-right p-4 text-sm font-semibold text-slate-600">Dönüşüm</th>
                                <th className="text-center p-4 text-sm font-semibold text-slate-600">Sipariş Önerisi</th>
                                <th className="text-center p-4 text-sm font-semibold text-slate-600">Aksiyon</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.slice(0, 50).map(product => {
                                const recommended = stockRecommendations[product.modelKodu] || 0;
                                const isAdded = addedProducts.has(product.modelKodu);

                                return (
                                    <tr key={product.modelKodu} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="p-4">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.productName}
                                                    className="w-12 h-12 object-cover rounded-lg"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236b7280"><rect width="24" height="24" rx="4"/></svg>';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-slate-400" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium text-slate-900 line-clamp-1">{product.productName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500">{product.modelKodu}</span>
                                                {product.productUrl && (
                                                    <a
                                                        href={product.productUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-500 hover:text-indigo-600"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${product.segment === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                                product.segment === 'B' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {product.segment}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-medium ${product.currentStock === null ? 'text-slate-400' :
                                                product.currentStock < settings.lowStockThreshold ? 'text-red-600' :
                                                    product.currentStock < 50 ? 'text-amber-600' : 'text-slate-700'
                                                }`}>
                                                {product.currentStock !== null ? formatNumber(product.currentStock) : '—'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-slate-700">{formatNumber(product.totalQuantity)}</td>
                                        <td className="p-4 text-right text-slate-700">{formatCurrency(product.totalRevenue)}</td>
                                        <td className="p-4 text-right">
                                            <span className={product.conversionRate < 1 ? 'text-amber-600' : 'text-emerald-600'}>
                                                {formatPercent(product.conversionRate)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {recommended > 0 ? (
                                                <span className="text-sm font-semibold text-indigo-600">{formatNumber(recommended)} adet</span>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                disabled={isAdded}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all ${isAdded
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                    }`}
                                            >
                                                <ShoppingCart className="w-4 h-4" />
                                                {isAdded ? 'Eklendi' : 'Ekle'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredProducts.length > 50 && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center text-sm text-slate-500">
                            İlk 50 ürün gösteriliyor ({formatNumber(filteredProducts.length)} toplam)
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                    <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">Ürün Bulunamadı</h3>
                    <p className="text-slate-500">Veri Yönetimi sayfasından Excel dosyalarınızı yükleyin</p>
                </div>
            )}
        </div>
    );
};

export default ProductsView;
