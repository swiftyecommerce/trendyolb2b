import React, { useState, useMemo } from 'react';
import {
    BarChart3, Package, AlertTriangle, TrendingUp, CheckCircle,
    Filter, ShoppingCart, DollarSign, Eye, Target, Layers,
    Info, ChevronDown, Heart, MousePointer, X, Image
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatCurrency, formatNumber, formatPercent } from '../lib/excelParser';
import CategoryMultiSelect from './CategoryMultiSelect';
import type { ProductStats, StockRecommendation } from '../types';

type AnalysisTab = 'overview' | 'opportunities' | 'profitability' | 'stock' | 'segments';
type DateRange = 1 | 7 | 30 | 365;

const DATE_LABELS: Record<DateRange, string> = { 1: '1G', 7: '7G', 30: '30G', 365: '1Y' };

const AnalysisView: React.FC = () => {
    const { getProductsByPeriod, settings, addToCart, getStockRecommendations, hasDataForPeriod, categories } = useAnalytics();
    const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
    const [dateRange, setDateRange] = useState<DateRange>(30);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [minImpressions, setMinImpressions] = useState(settings.minImpressionsForOpportunity);
    const [selectedProduct, setSelectedProduct] = useState<ProductStats | null>(null);
    const [segmentFilter, setSegmentFilter] = useState<'A' | 'B' | 'C' | null>(null);

    // Initialize selected categories to all when categories load
    React.useEffect(() => {
        if (categories.length > 0 && selectedCategories.length === 0) {
            setSelectedCategories([...categories]);
        }
    }, [categories]);

    // Filter products by selected categories
    const products = useMemo(() => {
        const allProducts = getProductsByPeriod(dateRange, undefined);
        if (selectedCategories.length === 0 || selectedCategories.length === categories.length) {
            return allProducts;
        }
        return allProducts.filter(p => p.category && selectedCategories.includes(p.category));
    }, [getProductsByPeriod, dateRange, selectedCategories, categories.length]);

    // Apply segment filter if set
    const displayProducts = useMemo(() => {
        if (segmentFilter) {
            return products.filter(p => p.segment === segmentFilter);
        }
        return products;
    }, [products, segmentFilter]);

    const stockRecommendations = useMemo(() =>
        getStockRecommendations(dateRange, undefined).filter(r =>
            selectedCategories.length === 0 ||
            selectedCategories.length === categories.length ||
            products.some(p => p.modelKodu === r.modelKodu)
        ),
        [getStockRecommendations, dateRange, products, selectedCategories, categories.length]
    );

    const periodAvailability = useMemo(() => ({
        1: hasDataForPeriod(1), 7: hasDataForPeriod(7), 30: hasDataForPeriod(30), 365: hasDataForPeriod(365)
    }), [hasDataForPeriod]);

    const hasData = products.length > 0;

    const tabs = [
        { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
        { id: 'opportunities', label: 'Fırsat Analizi', icon: TrendingUp },
        { id: 'profitability', label: 'Kârlılık', icon: DollarSign },
        { id: 'stock', label: 'Stok & Sipariş', icon: Package },
        { id: 'segments', label: 'Segmentler', icon: Layers }
    ];

    const clearSegmentFilter = () => setSegmentFilter(null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analiz</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {displayProducts.length} ürün
                        {segmentFilter && ` • Segment ${segmentFilter}`}
                        {selectedCategories.length < categories.length && ` • ${categories.length - selectedCategories.length} kategori hariç`}
                    </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    {segmentFilter && (
                        <button
                            onClick={clearSegmentFilter}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm"
                        >
                            Segment {segmentFilter}
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Category Multi-Select */}
                    {categories.length > 0 && (
                        <CategoryMultiSelect
                            categories={categories}
                            selectedCategories={selectedCategories}
                            onChange={setSelectedCategories}
                        />
                    )}

                    {/* Date Range Filter */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {([1, 7, 30, 365] as DateRange[]).map(days => (
                            <button
                                key={days}
                                onClick={() => setDateRange(days)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all relative ${dateRange === days
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : periodAvailability[days] ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400'
                                    }`}
                            >
                                {DATE_LABELS[days]}
                                {periodAvailability[days] && (
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as AnalysisTab); setSegmentFilter(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {!hasData ? (
                <EmptyState />
            ) : (
                <>
                    {activeTab === 'overview' && <OverviewTab products={displayProducts} />}
                    {activeTab === 'opportunities' && (
                        <OpportunitiesTab
                            products={displayProducts}
                            minImpressions={minImpressions}
                            onMinImpressionsChange={setMinImpressions}
                            onSelectProduct={setSelectedProduct}
                        />
                    )}
                    {activeTab === 'profitability' && <ProfitabilityTab products={displayProducts} />}
                    {activeTab === 'stock' && (
                        <StockTab
                            recommendations={stockRecommendations}
                            onAddToCart={addToCart}
                            products={products}
                            days={dateRange}
                        />
                    )}
                    {activeTab === 'segments' && (
                        <SegmentsTab
                            products={products}
                            onSegmentClick={(seg) => setSegmentFilter(seg)}
                            activeSegment={segmentFilter}
                        />
                    )}
                </>
            )}

            {/* Product Detail Modal */}
            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </div>
    );
};

// Product Image Component
const ProductImage: React.FC<{ src?: string; name: string; size?: 'sm' | 'md' }> = ({ src, name, size = 'sm' }) => {
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
                (e.target as HTMLImageElement).parentElement?.classList.add('bg-slate-100', 'flex', 'items-center', 'justify-center');
            }}
        />
    );
};

// Product Detail Modal
const ProductDetailModal: React.FC<{ product: ProductStats; onClose: () => void }> = ({ product, onClose }) => {
    const getRecommendations = () => {
        const recs = [];

        // View to Cart analysis
        if (product.totalImpressions > 100) {
            if (product.viewToCartRate < 2) {
                recs.push({
                    type: 'visual',
                    title: 'Görsel / Başlık İyileştirmesi',
                    description: 'Görüntülenme yüksek ama sepete ekleme düşük.',
                    details: [
                        'Ana görsel kalitesini artırın (minimum 1000x1000px)',
                        'Ürün başlığını SEO uyumlu hale getirin',
                        'İlk 3 kelimede ana anahtar kelimeyi kullanın',
                        'Beyaz arka plan tercih edin'
                    ],
                    metric: `Sepete Ekleme Oranı: ${formatPercent(product.viewToCartRate)}`,
                    urgency: 'high'
                });
            }

            // Cart to Sale analysis
            if (product.cartToSaleRate < 20 && product.totalAddToCart > 10) {
                recs.push({
                    type: 'price',
                    title: 'Fiyat / Kampanya Analizi',
                    description: 'Sepete eklenme var ama satışa dönüşmüyor.',
                    details: [
                        'Rakip fiyatlarını kontrol edin',
                        'Kargo ücreti etkisini değerlendirin',
                        'Kampanya veya kupon ekleyin',
                        'Stok durumunu kontrol edin'
                    ],
                    metric: `Satışa Dönüşüm: ${formatPercent(product.cartToSaleRate)}`,
                    urgency: 'medium'
                });
            }
        }

        if (product.conversionRate < 0.5 && product.totalImpressions > 500) {
            recs.push({
                type: 'content',
                title: 'İçerik Optimizasyonu',
                description: 'Çok görüntüleniyor ama dönüşüm çok düşük.',
                details: [
                    'Ürün açıklamasını detaylandırın',
                    'Özellikler bölümünü güncelleyin',
                    'Video eklemeyi düşünün',
                    'Müşteri yorumlarını artırın'
                ],
                metric: `Dönüşüm Oranı: ${formatPercent(product.conversionRate)}`,
                urgency: 'high'
            });
        }

        return recs;
    };

    const recommendations = getRecommendations();

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-slate-900">Ürün Analizi</h3>
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
                            <p className="text-sm text-slate-400 mt-1">{product.category}</p>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-3">
                        <MetricCard label="Görüntülenme" value={formatNumber(product.totalImpressions)} icon={Eye} />
                        <MetricCard label="Sepete Ekleme" value={formatNumber(product.totalAddToCart)} icon={ShoppingCart} />
                        <MetricCard label="Satış" value={formatNumber(product.totalQuantity)} icon={Target} />
                        <MetricCard label="Ciro" value={formatCurrency(product.totalRevenue)} icon={DollarSign} />
                    </div>

                    {/* Funnel Rates */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h5 className="text-sm font-semibold text-slate-700 mb-3">Dönüşüm Hunisi</h5>
                        <div className="flex items-center gap-2">
                            <FunnelStep label="Görüntüleme → Sepet" value={product.viewToCartRate} threshold={2} />
                            <div className="text-slate-300">→</div>
                            <FunnelStep label="Sepet → Satış" value={product.cartToSaleRate} threshold={20} />
                            <div className="text-slate-300">→</div>
                            <FunnelStep label="Genel Dönüşüm" value={product.conversionRate} threshold={1} />
                        </div>
                    </div>

                    {/* Recommendations */}
                    {recommendations.length > 0 ? (
                        <div className="space-y-3">
                            <h5 className="text-sm font-semibold text-slate-700">İyileştirme Önerileri</h5>
                            {recommendations.map((rec, idx) => (
                                <div key={idx} className={`border rounded-xl p-4 ${rec.urgency === 'high' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                                    }`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <h6 className="font-semibold text-slate-900">{rec.title}</h6>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${rec.urgency === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {rec.urgency === 'high' ? 'Yüksek Öncelik' : 'Orta Öncelik'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-2">{rec.description}</p>
                                    <p className="text-xs text-slate-500 mb-3">{rec.metric}</p>
                                    <ul className="space-y-1">
                                        {rec.details.map((detail, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                            <CheckCircle className="w-5 h-5 text-emerald-600 inline mr-2" />
                            <span className="text-emerald-700 font-medium">Bu ürün iyi performans gösteriyor!</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: string; icon: React.FC<any> }> = ({ label, value, icon: Icon }) => (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
        <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-900">{value}</p>
    </div>
);

const FunnelStep: React.FC<{ label: string; value: number; threshold: number }> = ({ label, value, threshold }) => (
    <div className="flex-1 text-center">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`font-bold ${value < threshold ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatPercent(value)}
        </p>
    </div>
);

// Empty State
const EmptyState: React.FC = () => (
    <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
        <BarChart3 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">Analiz İçin Veri Gerekli</h3>
        <p className="text-slate-500">Veri Yönetimi sayfasından Excel dosyalarınızı yükleyin</p>
    </div>
);

// Overview Tab
const OverviewTab: React.FC<{ products: ProductStats[] }> = ({ products }) => {
    const topByCiro = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);
    const topBySales = [...products].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
    const topByConversion = products.filter(p => p.totalImpressions > 100)
        .sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 10);
    const lowConversion = products.filter(p => p.totalImpressions > 100)
        .sort((a, b) => a.conversionRate - b.conversionRate).slice(0, 10);

    return (
        <div className="grid grid-cols-2 gap-6">
            <ProductTable title="En Çok Ciro" products={topByCiro} highlightKey="totalRevenue" />
            <ProductTable title="En Çok Satış" products={topBySales} highlightKey="totalQuantity" />
            <ProductTable title="En Yüksek Dönüşüm" products={topByConversion} highlightKey="conversionRate" />
            <ProductTable title="En Düşük Dönüşüm" products={lowConversion} highlightKey="conversionRate" isWarning />
        </div>
    );
};

// Opportunities Tab
const OpportunitiesTab: React.FC<{
    products: ProductStats[];
    minImpressions: number;
    onMinImpressionsChange: (v: number) => void;
    onSelectProduct: (p: ProductStats) => void;
}> = ({ products, minImpressions, onMinImpressionsChange, onSelectProduct }) => {
    const opportunities = useMemo(() => {
        return products
            .filter(p => p.totalImpressions >= minImpressions && p.conversionRate < 1)
            .sort((a, b) => b.totalImpressions - a.totalImpressions)
            .map(p => ({
                ...p,
                suggestionType: p.viewToCartRate < 2 ? 'visual' : 'price',
                suggestion: p.viewToCartRate < 2 ? 'Görsel / başlık iyileştirmesi' : 'Fiyat / kampanya analizi'
            }));
    }, [products, minImpressions]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800 flex-1">
                    Yüksek görüntülenme ama düşük dönüşüm. <strong>Detaylar için satıra tıklayın.</strong>
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-700">Min. görüntülenme:</span>
                    <input
                        type="number"
                        value={minImpressions}
                        onChange={(e) => onMinImpressionsChange(Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-amber-300 rounded-lg text-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left p-4 text-sm font-semibold text-slate-600 w-16">Görsel</th>
                            <th className="text-left p-4 text-sm font-semibold text-slate-600">Ürün</th>
                            <th className="text-right p-4 text-sm font-semibold text-slate-600">Görüntülenme</th>
                            <th className="text-right p-4 text-sm font-semibold text-slate-600">Sepete Ekleme</th>
                            <th className="text-right p-4 text-sm font-semibold text-slate-600">Satış</th>
                            <th className="text-right p-4 text-sm font-semibold text-slate-600">Dönüşüm</th>
                            <th className="text-left p-4 text-sm font-semibold text-slate-600">Öneri</th>
                        </tr>
                    </thead>
                    <tbody>
                        {opportunities.slice(0, 20).map(product => (
                            <tr
                                key={product.modelKodu}
                                className="border-t border-slate-100 hover:bg-indigo-50 cursor-pointer transition-colors"
                                onClick={() => onSelectProduct(product)}
                            >
                                <td className="p-4">
                                    <ProductImage src={product.imageUrl} name={product.productName} />
                                </td>
                                <td className="p-4">
                                    <p className="font-medium text-slate-900 truncate max-w-xs">{product.productName}</p>
                                    <p className="text-xs text-slate-500">{product.modelKodu}</p>
                                </td>
                                <td className="p-4 text-right text-slate-700">{formatNumber(product.totalImpressions)}</td>
                                <td className="p-4 text-right text-slate-700">{formatNumber(product.totalAddToCart)}</td>
                                <td className="p-4 text-right text-slate-700">{formatNumber(product.totalQuantity)}</td>
                                <td className="p-4 text-right">
                                    <span className="text-red-600 font-medium">{formatPercent(product.conversionRate)}</span>
                                </td>
                                <td className="p-4">
                                    <span className={`text-xs px-2 py-1 rounded-full ${product.suggestionType === 'visual'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {product.suggestion}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {opportunities.length === 0 && (
                    <p className="p-8 text-center text-slate-400">Bu kriterlere uyan ürün bulunamadı</p>
                )}
            </div>
        </div>
    );
};

// Profitability Tab
const ProfitabilityTab: React.FC<{ products: ProductStats[] }> = ({ products }) => {
    const sortedByRevenue = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue);

    return (
        <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <Info className="w-5 h-5 text-blue-600 inline mr-2" />
                <span className="text-sm text-blue-800">
                    Maliyet verisi Excel'de mevcut değilse, ciro bazlı sıralama gösterilir.
                </span>
            </div>
            <ProductTable title="Ciro Sıralaması" products={sortedByRevenue.slice(0, 20)} highlightKey="totalRevenue" />
        </div>
    );
};

// Stock Tab with engagement metrics
const StockTab: React.FC<{
    recommendations: StockRecommendation[];
    onAddToCart: (product: ProductStats, qty: number) => void;
    products: ProductStats[];
    days: number;
}> = ({ recommendations, onAddToCart, products, days }) => {
    const criticalCount = recommendations.filter(r => r.urgency === 'critical').length;
    const warningCount = recommendations.filter(r => r.urgency === 'warning').length;

    const handleAddToCart = (rec: StockRecommendation) => {
        const product = products.find(p => p.modelKodu === rec.modelKodu);
        if (product && rec.recommendedOrder > 0) {
            onAddToCart(product, rec.recommendedOrder);
        }
    };

    // Get product stats for engagement metrics
    const getProductStats = (modelKodu: string) => products.find(p => p.modelKodu === modelKodu);

    return (
        <div className="space-y-4">
            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-700">Kritik Stok</span>
                    </div>
                    <p className="text-3xl font-bold text-red-700 mt-2">{criticalCount}</p>
                    <p className="text-sm text-red-600">5 gün içinde tükenecek</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <span className="font-semibold text-amber-700">Uyarı</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-700 mt-2">{warningCount}</p>
                    <p className="text-sm text-amber-600">10 gün içinde tükenecek</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold text-emerald-700">Yeterli Stok</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">
                        {recommendations.filter(r => r.urgency === 'ok').length}
                    </p>
                    <p className="text-sm text-emerald-600">10 günden fazla</p>
                </div>
            </div>

            {/* Recommendations Table with engagement metrics */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-700">Sipariş Önerileri ({days} günlük veriye göre)</h3>
                </div>
                <table className="w-full min-w-[1000px]">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left p-3 text-xs font-semibold text-slate-500 w-12">Görsel</th>
                            <th className="text-left p-3 text-xs font-semibold text-slate-500">Ürün</th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500">Stok</th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500">Günlük Satış</th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500">Kalan Gün</th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500 bg-blue-50">
                                <Eye className="w-3 h-3 inline mr-1" />Görüntülenme
                            </th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500 bg-blue-50">
                                <Heart className="w-3 h-3 inline mr-1" />Favori
                            </th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500 bg-blue-50">
                                <ShoppingCart className="w-3 h-3 inline mr-1" />Sepet
                            </th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500 bg-blue-50">
                                <Target className="w-3 h-3 inline mr-1" />Satış
                            </th>
                            <th className="text-right p-3 text-xs font-semibold text-slate-500">Önerilen</th>
                            <th className="text-center p-3 text-xs font-semibold text-slate-500 w-24">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recommendations.filter(r => r.urgency !== 'ok').slice(0, 30).map(rec => {
                            const stats = getProductStats(rec.modelKodu);
                            return (
                                <tr
                                    key={rec.modelKodu}
                                    className={`border-t border-slate-100 ${rec.urgency === 'critical' ? 'bg-red-50' : rec.urgency === 'warning' ? 'bg-amber-50' : ''
                                        }`}
                                >
                                    <td className="p-3">
                                        <ProductImage src={rec.imageUrl} name={rec.productName} />
                                    </td>
                                    <td className="p-3">
                                        <p className="font-medium text-slate-900 truncate max-w-[200px]">{rec.productName}</p>
                                        <p className="text-xs text-slate-500">{rec.modelKodu}</p>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className={`font-medium ${rec.currentStock === null ? 'text-slate-400' :
                                                rec.currentStock < 10 ? 'text-red-600' : 'text-slate-700'
                                            }`}>
                                            {rec.currentStock !== null ? formatNumber(rec.currentStock) : '—'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right text-slate-700">{rec.dailySales.toFixed(1)}</td>
                                    <td className="p-3 text-right">
                                        <span className={`font-medium ${rec.daysUntilEmpty === null ? 'text-slate-400' :
                                                rec.daysUntilEmpty <= 5 ? 'text-red-600' :
                                                    rec.daysUntilEmpty <= 10 ? 'text-amber-600' : 'text-emerald-600'
                                            }`}>
                                            {rec.daysUntilEmpty !== null ? `${rec.daysUntilEmpty.toFixed(0)}g` : '—'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right text-blue-600 bg-blue-50/50">
                                        {stats ? formatNumber(stats.totalImpressions) : '—'}
                                    </td>
                                    <td className="p-3 text-right text-blue-600 bg-blue-50/50">
                                        {stats ? formatNumber(stats.totalFavorites) : '—'}
                                    </td>
                                    <td className="p-3 text-right text-blue-600 bg-blue-50/50">
                                        {stats ? formatNumber(stats.totalAddToCart) : '—'}
                                    </td>
                                    <td className="p-3 text-right text-blue-600 bg-blue-50/50">
                                        {stats ? formatNumber(stats.totalQuantity) : '—'}
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="font-bold text-indigo-600">{formatNumber(rec.recommendedOrder)}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {rec.recommendedOrder > 0 && (
                                            <button
                                                onClick={() => handleAddToCart(rec)}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700"
                                            >
                                                <ShoppingCart className="w-3 h-3" />
                                                Ekle
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {recommendations.filter(r => r.urgency !== 'ok').length === 0 && (
                    <p className="p-8 text-center text-slate-400">Stok uyarısı yok</p>
                )}
            </div>
        </div>
    );
};

// Segments Tab with clickable cards
const SegmentsTab: React.FC<{
    products: ProductStats[];
    onSegmentClick: (seg: 'A' | 'B' | 'C') => void;
    activeSegment: 'A' | 'B' | 'C' | null;
}> = ({ products, onSegmentClick, activeSegment }) => {
    const segments = useMemo(() => {
        const a = products.filter(p => p.segment === 'A');
        const b = products.filter(p => p.segment === 'B');
        const c = products.filter(p => p.segment === 'C');

        const totalRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);

        return {
            A: {
                products: a,
                count: a.length,
                revenue: a.reduce((s, p) => s + p.totalRevenue, 0),
                revenuePercent: totalRevenue > 0 ? (a.reduce((s, p) => s + p.totalRevenue, 0) / totalRevenue) * 100 : 0,
                avgRevenue: a.length > 0 ? a.reduce((s, p) => s + p.totalRevenue, 0) / a.length : 0,
                description: 'En değerli ürünler. Satışların büyük kısmını oluşturuyor.',
                actions: ['Stok takibine öncelik verin', 'Premium pazarlama yapın', 'Fiyat optimizasyonu uygulayın']
            },
            B: {
                products: b,
                count: b.length,
                revenue: b.reduce((s, p) => s + p.totalRevenue, 0),
                revenuePercent: totalRevenue > 0 ? (b.reduce((s, p) => s + p.totalRevenue, 0) / totalRevenue) * 100 : 0,
                avgRevenue: b.length > 0 ? b.reduce((s, p) => s + p.totalRevenue, 0) / b.length : 0,
                description: 'Orta değerli ürünler. Potansiyel A segmenti adayları.',
                actions: ['Görünürlüğü artırın', 'Cross-sell fırsatları', 'Kampanya önceliği verin']
            },
            C: {
                products: c,
                count: c.length,
                revenue: c.reduce((s, p) => s + p.totalRevenue, 0),
                revenuePercent: totalRevenue > 0 ? (c.reduce((s, p) => s + p.totalRevenue, 0) / totalRevenue) * 100 : 0,
                avgRevenue: c.length > 0 ? c.reduce((s, p) => s + p.totalRevenue, 0) / c.length : 0,
                description: 'Düşük cirolu ürünler. Değerlendirme gerekebilir.',
                actions: ['Maliyetleri gözden geçirin', 'Katalogdan çıkarma değerlendirin', 'Paket satış deneyin']
            }
        };
    }, [products]);

    return (
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-700 mb-2">ABC Segmentasyonu</h3>
                <p className="text-sm text-slate-500">
                    <strong>A:</strong> Cironun %80'i • <strong>B:</strong> Sonraki %15 • <strong>C:</strong> Son %5
                    <br /><span className="text-indigo-600">Detaylı listeyi görmek için kartlara tıklayın.</span>
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {(['A', 'B', 'C'] as const).map(seg => (
                    <button
                        key={seg}
                        onClick={() => onSegmentClick(seg)}
                        className={`rounded-xl p-5 border text-left transition-all hover:shadow-lg ${seg === 'A' ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400' :
                                seg === 'B' ? 'bg-blue-50 border-blue-200 hover:border-blue-400' :
                                    'bg-slate-50 border-slate-200 hover:border-slate-400'
                            } ${activeSegment === seg ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-2xl font-bold ${seg === 'A' ? 'text-emerald-700' : seg === 'B' ? 'text-blue-700' : 'text-slate-700'
                                }`}>
                                Segment {seg}
                            </span>
                            <span className={`text-3xl font-black ${seg === 'A' ? 'text-emerald-600' : seg === 'B' ? 'text-blue-600' : 'text-slate-600'
                                }`}>
                                {formatPercent(segments[seg].revenuePercent)}
                            </span>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">{segments[seg].description}</p>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Ürün Sayısı</span>
                                <span className="font-semibold">{formatNumber(segments[seg].count)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Toplam Ciro</span>
                                <span className="font-semibold">{formatCurrency(segments[seg].revenue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Ort. Ürün Cirosu</span>
                                <span className="font-semibold">{formatCurrency(segments[seg].avgRevenue)}</span>
                            </div>
                        </div>

                        <div className={`text-xs space-y-1 ${seg === 'A' ? 'text-emerald-700' : seg === 'B' ? 'text-blue-700' : 'text-slate-600'
                            }`}>
                            <p className="font-semibold">Önerilen Aksiyonlar:</p>
                            {segments[seg].actions.map((action, i) => (
                                <p key={i} className="flex items-center gap-1">
                                    <span>•</span> {action}
                                </p>
                            ))}
                        </div>
                    </button>
                ))}
            </div>

            {/* Segment Products List (when segment selected) */}
            {activeSegment && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-700">
                            Segment {activeSegment} Ürünleri ({segments[activeSegment].count} ürün)
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {segments[activeSegment].products.slice(0, 20).map((product, idx) => (
                            <div key={product.modelKodu} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                                <span className="text-sm text-slate-400 w-6">{idx + 1}</span>
                                <ProductImage src={product.imageUrl} name={product.productName} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{product.productName}</p>
                                    <p className="text-xs text-slate-500">{product.modelKodu}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(product.totalRevenue)}</p>
                                    <p className="text-xs text-slate-500">{formatNumber(product.totalQuantity)} adet</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Reusable Product Table
const ProductTable: React.FC<{
    title: string;
    products: ProductStats[];
    highlightKey: 'totalRevenue' | 'totalQuantity' | 'conversionRate';
    isWarning?: boolean;
}> = ({ title, products, highlightKey, isWarning }) => {
    const formatHighlight = (product: ProductStats) => {
        switch (highlightKey) {
            case 'totalRevenue': return formatCurrency(product.totalRevenue);
            case 'totalQuantity': return `${formatNumber(product.totalQuantity)} adet`;
            case 'conversionRate': return formatPercent(product.conversionRate);
        }
    };

    return (
        <div className={`rounded-xl border overflow-hidden ${isWarning ? 'border-amber-200' : 'border-slate-200'}`}>
            <div className={`px-4 py-3 border-b ${isWarning ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`font-semibold ${isWarning ? 'text-amber-700' : 'text-slate-700'}`}>{title}</h3>
            </div>
            <div className="bg-white divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {products.map((product, idx) => (
                    <div key={product.modelKodu} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                idx === 1 ? 'bg-slate-200 text-slate-600' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {idx + 1}
                        </span>
                        <ProductImage src={product.imageUrl} name={product.productName} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{product.productName}</p>
                            <p className="text-xs text-slate-500">{product.modelKodu}</p>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
                            {formatHighlight(product)}
                        </span>
                    </div>
                ))}
                {products.length === 0 && (
                    <p className="px-4 py-6 text-center text-slate-400 text-sm">Veri yok</p>
                )}
            </div>
        </div>
    );
};

export default AnalysisView;
