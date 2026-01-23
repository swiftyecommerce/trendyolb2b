import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart3, Package, AlertTriangle, TrendingUp, TrendingDown, CheckCircle,
    ShoppingBag, PieChart, LayoutDashboard, Lightbulb,
    Info, ChevronDown, Heart, MousePointer, X, Image, Snowflake, Calendar, ExternalLink,
    Search, Filter, ShoppingCart, DollarSign, Eye, Target, Layers, ArrowUpRight, ArrowDownRight,
    ChevronUp
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatCurrency, formatNumber, formatPercent } from '../lib/excelParser';
import CategoryMultiSelect from './CategoryMultiSelect';
import ComparisonTable, { ProductComparison } from './ComparisonTable';
import type { ProductStats, StockRecommendation, AnalysisType, AnalysisFilters } from '../types';
import AddToCartControl from './AddToCartControl';

// Extended tab types to include proof tabs
type AnalysisTab = 'overview' | 'opportunities' | 'trends' | 'dormant' | 'stock' | 'segments';
type DateRange = 1 | 7 | 30 | 365;

const DATE_LABELS: Record<DateRange, string> = { 1: '1G', 7: '7G', 30: '30G', 365: '1Y' };

interface AnalysisViewProps {
    initialFilter?: {
        tab?: string;
        analysisType?: AnalysisType;
        filters?: AnalysisFilters;
        relatedProducts?: string[];
        segment?: 'A' | 'B' | 'C';
    };
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ initialFilter }) => {
    const { getProductsByPeriod, settings, addToCart, getStockRecommendations, hasDataForPeriod, categories } = useAnalytics();
    const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');

    // Updated Trend Tabs
    const [trendTab, setTrendTab] = useState<'rising' | 'cooling' | 'yoy-growth' | 'yoy-decline'>('rising');

    // Segment interactive state
    const [expandedSegment, setExpandedSegment] = useState<'A' | 'B' | 'C' | null>(null);

    const [dateRange, setDateRange] = useState<DateRange>(30);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [minImpressions, setMinImpressions] = useState(settings.minImpressionsForOpportunity);
    const [selectedProduct, setSelectedProduct] = useState<ProductStats | null>(null);
    const [segmentFilter, setSegmentFilter] = useState<'A' | 'B' | 'C' | null>(null);

    // For notification-driven filtering
    const [relatedProductsFilter, setRelatedProductsFilter] = useState<string[] | null>(null);
    const [activeAnalysisType, setActiveAnalysisType] = useState<AnalysisType | null>(null);

    // Apply initial filter from notification
    useEffect(() => {
        if (initialFilter) {
            if (initialFilter.analysisType) {
                setActiveAnalysisType(initialFilter.analysisType);

                switch (initialFilter.analysisType) {
                    case 'cooling-products':
                    case 'rising-products':
                    case 'yoy-comparison':
                        setActiveTab('trends');
                        if (initialFilter.analysisType === 'cooling-products') setTrendTab('cooling');
                        if (initialFilter.analysisType === 'rising-products') setTrendTab('rising');
                        if (initialFilter.analysisType === 'yoy-comparison') setTrendTab('yoy-decline');
                        break;
                    case 'dormant-products':
                        setActiveTab('dormant');
                        break;
                    case 'stock-critical':
                    case 'stock-warning':
                        setActiveTab('stock');
                        break;
                    case 'conversion-drop':
                    case 'cart-abandon':
                        setActiveTab('opportunities');
                        break;
                    default:
                        if (initialFilter.tab) setActiveTab(initialFilter.tab as AnalysisTab);
                }
            } else if (initialFilter.tab) {
                setActiveTab(initialFilter.tab as AnalysisTab);
            }

            if (initialFilter.segment) {
                setSegmentFilter(initialFilter.segment);
                setExpandedSegment(initialFilter.segment); // Auto-expand if targeted
            }
            if (initialFilter.relatedProducts && initialFilter.relatedProducts.length > 0) {
                setRelatedProductsFilter(initialFilter.relatedProducts);
            }
        }
    }, [initialFilter]);

    useEffect(() => {
        if (categories.length > 0 && selectedCategories.length === 0) {
            setSelectedCategories([...categories]);
        }
    }, [categories]);

    // Data Loading & Processing
    const products30 = useMemo(() => getProductsByPeriod(30), [getProductsByPeriod]);
    const products7 = useMemo(() => getProductsByPeriod(7), [getProductsByPeriod]);

    const { getHistoricalProducts } = useAnalytics();
    const prevYearProducts = useMemo(() => {
        const now = new Date();
        const lastYear = now.getFullYear() - 1;
        const currentMonth = now.getMonth() + 1;
        return getHistoricalProducts(lastYear, currentMonth);
    }, [getHistoricalProducts]);

    const prevMonthProducts = useMemo(() => {
        const now = new Date();
        let prevMonth = now.getMonth(); // 0-11, so prevMonth=0 is Jan
        let prevYear = now.getFullYear();
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }
        return getHistoricalProducts(prevYear, prevMonth);
    }, [getHistoricalProducts]);

    const products = useMemo(() => {
        let filtered = getProductsByPeriod(dateRange, undefined);
        if (selectedCategories.length > 0 && selectedCategories.length < categories.length) {
            filtered = filtered.filter(p => p.category && selectedCategories.includes(p.category));
        }
        return filtered;
    }, [getProductsByPeriod, dateRange, selectedCategories, categories.length]);

    const displayProducts = useMemo(() => {
        let result = products;
        if (segmentFilter) result = result.filter(p => p.segment === segmentFilter);
        if (relatedProductsFilter && relatedProductsFilter.length > 0) {
            result = result.filter(p => relatedProductsFilter.includes(p.modelKodu));
        }
        return result;
    }, [products, segmentFilter, relatedProductsFilter]);

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

    // --- Comparisons Logic (Safeguarded against NaN) ---
    // --- Comparisons Logic (Safeguarded against NaN) ---
    const comparisons = useMemo(() => {
        const cooling: ProductComparison[] = [];
        const rising: ProductComparison[] = [];
        const yoyGrowth: ProductComparison[] = [];
        const yoyDecline: ProductComparison[] = [];
        const segments = { A: [] as ProductComparison[], B: [] as ProductComparison[], C: [] as ProductComparison[] };

        // Process Trends & Segments
        for (const p30 of products30) {
            // Find historical previous month data
            const prevMonthProd = prevMonthProducts.find(p => p.modelKodu === p30.modelKodu);

            const currentRev = p30.totalRevenue || 0;
            const prevRev = prevMonthProd?.totalRevenue || 0;
            const currentQty = p30.totalQuantity || 0;
            const prevQty = prevMonthProd?.totalQuantity || 0;

            const changePercent = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : (currentRev > 0 ? 100 : 0);
            const impactAmount = Math.abs(currentRev - prevRev);

            // Base comparison object (MoM default)
            const comparison: ProductComparison = {
                modelKodu: p30.modelKodu,
                productName: p30.productName,
                imageUrl: p30.imageUrl,
                productUrl: p30.productUrl,
                category: p30.category,
                oldValue: prevRev,
                newValue: currentRev,
                changePercent: isNaN(changePercent) ? 0 : changePercent,
                changeType: changePercent > 5 ? 'increase' : changePercent < -5 ? 'decrease' : 'stable',
                impactAmount: isNaN(impactAmount) ? 0 : impactAmount,
                impactType: changePercent < -5 ? 'loss' : changePercent > 5 ? 'gain' : 'neutral',
                oldQuantity: prevQty,
                newQuantity: currentQty,
                segment: p30.segment
            };

            // Add to Trends
            if (comparison.changePercent < -20 && prevRev > 1000) cooling.push(comparison);
            else if (comparison.changePercent > 20 && currentRev > 1000) rising.push(comparison);

            // Add to Segments (Always Show MoM)
            if (p30.segment) {
                segments[p30.segment].push(comparison);
            }

            // YoY Logic
            if (prevYearProducts && prevYearProducts.length > 0) {
                const prev = prevYearProducts.find(p => p.modelKodu === p30.modelKodu);
                if (prev) {
                    const prevRevY = prev.totalRevenue || 0;
                    const yoyChange = prevRevY > 0 ? ((currentRev - prevRevY) / prevRevY) * 100 : 0;
                    const yoyImpact = Math.abs(currentRev - prevRevY);

                    const yoyComp: ProductComparison = {
                        ...comparison,
                        oldValue: prevRevY,
                        newValue: currentRev,
                        changePercent: isNaN(yoyChange) ? 0 : yoyChange,
                        changeType: yoyChange > 0 ? 'increase' : 'decrease',
                        impactAmount: isNaN(yoyImpact) ? 0 : yoyImpact,
                        impactType: yoyChange > 0 ? 'gain' : 'loss',
                        oldQuantity: prev.totalQuantity,
                        newQuantity: currentQty
                    };

                    if (yoyChange > 20) yoyGrowth.push(yoyComp);
                    else if (yoyChange < -20) yoyDecline.push(yoyComp);
                }
            }
        }

        return {
            cooling: cooling.sort((a, b) => b.impactAmount - a.impactAmount),
            rising: rising.sort((a, b) => b.impactAmount - a.impactAmount),
            yoyGrowth: yoyGrowth.sort((a, b) => b.impactAmount - a.impactAmount),
            yoyDecline: yoyDecline.sort((a, b) => b.impactAmount - a.impactAmount),
            segments
        };
    }, [products30, prevYearProducts, prevMonthProducts, relatedProductsFilter]);


    const renderContent = () => {
        switch (activeTab) {
            case 'trends':
                return (
                    <div className="space-y-6">
                        {/* Trend Sub-Navigation */}
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase px-2 hidden md:block">Analiz Modu:</span>
                            <button
                                onClick={() => setTrendTab('rising')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${trendTab === 'rising' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'
                                    }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                Yükselenler
                            </button>
                            <button
                                onClick={() => setTrendTab('cooling')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${trendTab === 'cooling' ? 'bg-white text-red-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'
                                    }`}
                            >
                                <TrendingDown className="w-4 h-4" />
                                Düşüştekiler
                            </button>

                            <div className="w-px h-6 bg-slate-300 mx-2 hidden md:block"></div>

                            <button
                                onClick={() => setTrendTab('yoy-growth')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${trendTab === 'yoy-growth' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'
                                    }`}
                            >
                                <ArrowUpRight className="w-4 h-4" />
                                Yıllık Büyüyenler
                            </button>
                            <button
                                onClick={() => setTrendTab('yoy-decline')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${trendTab === 'yoy-decline' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'
                                    }`}
                            >
                                <ArrowDownRight className="w-4 h-4" />
                                Yıllık Kaybedenler
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-[400px]">
                            {trendTab === 'rising' && (
                                <ComparisonTable
                                    title={`${comparisons.rising.length} Ürün Yükselişte`}
                                    description="Geçen aya göre ciro artışı yakalayan ürünler."
                                    analysisType="rising"
                                    products={comparisons.rising}
                                    oldPeriodLabel="Geçen Ay"
                                    newPeriodLabel="Bu Ay"
                                    showImpact={true}
                                />
                            )}
                            {trendTab === 'cooling' && (
                                <ComparisonTable
                                    title={`${comparisons.cooling.length} Ürün Düşüşte`}
                                    description="Geçen aya göre ciro kaybı yaşayan ürünler."
                                    analysisType="cooling"
                                    products={comparisons.cooling}
                                    oldPeriodLabel="Geçen Ay"
                                    newPeriodLabel="Bu Ay"
                                    showImpact={true}
                                />
                            )}
                            {(trendTab === 'yoy-growth' || trendTab === 'yoy-decline') && !prevYearProducts?.length ? (
                                <YoYEmptyState />
                            ) : (
                                <>
                                    {trendTab === 'yoy-growth' && (
                                        <ComparisonTable
                                            title="Yıllık Büyüyenler"
                                            description="Geçen yılın aynı ayına göre büyüyenler."
                                            analysisType="yoy-comparison"
                                            products={comparisons.yoyGrowth}
                                            oldPeriodLabel="Geçen Yıl"
                                            newPeriodLabel="Bu Yıl"
                                            showImpact={true}
                                            impactLabel="Yıllık Artış"
                                        />
                                    )}
                                    {trendTab === 'yoy-decline' && (
                                        <ComparisonTable
                                            title="Yıllık Kaybedenler"
                                            description="Geçen yılın aynı ayına göre küçülenler."
                                            analysisType="yoy-comparison"
                                            products={comparisons.yoyDecline}
                                            oldPeriodLabel="Geçen Yıl"
                                            newPeriodLabel="Bu Yıl"
                                            showImpact={true}
                                            impactLabel="Yıllık Kayıp"
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );

            case 'segments':
                return (
                    <div className="space-y-8">
                        {/* Segment Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SegmentCard
                                title="A Segmenti"
                                description="Cironun %80'ini oluşturan en değerli ürünler"
                                count={comparisons.segments.A.length}
                                color="emerald"
                                isActive={expandedSegment === 'A'}
                                onClick={() => setExpandedSegment(expandedSegment === 'A' ? null : 'A')}
                            />
                            <SegmentCard
                                title="B Segmenti"
                                description="Cironun %15'ini oluşturan orta segment"
                                count={comparisons.segments.B.length}
                                color="blue"
                                isActive={expandedSegment === 'B'}
                                onClick={() => setExpandedSegment(expandedSegment === 'B' ? null : 'B')}
                            />
                            <SegmentCard
                                title="C Segmenti"
                                description="Cironun %5'ini oluşturan düşük performanslılar"
                                count={comparisons.segments.C.length}
                                color="amber"
                                isActive={expandedSegment === 'C'}
                                onClick={() => setExpandedSegment(expandedSegment === 'C' ? null : 'C')}
                            />
                        </div>

                        {/* Expandable Content Area */}
                        {expandedSegment && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className={`border-t-4 rounded-xl shadow-sm bg-white overflow-hidden ${expandedSegment === 'A' ? 'border-emerald-500' :
                                    expandedSegment === 'B' ? 'border-blue-500' : 'border-amber-500'
                                    }`}>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-xl font-bold text-slate-900">
                                                {expandedSegment} Segmenti Detayları
                                            </h3>
                                            <button
                                                onClick={() => setExpandedSegment(null)}
                                                className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <ComparisonTable
                                            title={`${expandedSegment} Segmenti Ürünleri`}
                                            description="Bu segmentteki ürünlerin geçen aya göre performansı."
                                            analysisType="segment"
                                            products={comparisons.segments[expandedSegment]}
                                            oldPeriodLabel="Geçen Ay"
                                            newPeriodLabel="Bu Ay"
                                            showImpact={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {!expandedSegment && (
                            <div className="text-center p-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <MousePointer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Detayları görmek için yukarıdaki kutulardan birine tıklayın.</p>
                            </div>
                        )}
                    </div>
                );

            case 'opportunities':
                const opportunities = comparisons.rising.filter(p => (p.oldQuantity || 0) * 2 < (p.newValue || 0)); // Dummy logic for safe filtering
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
                            <Lightbulb className="w-12 h-12 text-indigo-200 mb-4" />
                            <h3 className="text-2xl font-bold mb-2">Fırsat Analizi</h3>
                            <p className="text-indigo-100 max-w-2xl">
                                Yüksek görüntülenme ve sepete ekleme oranına sahip ancak satışı düşük olan ürünler listelenir.
                                Bu ürünlerde küçük bir fiyat veya görsel iyileştirmesi büyük ciro artışı sağlayabilir.
                            </p>
                        </div>
                        <OpportunitiesTab
                            products={displayProducts}
                            minImpressions={minImpressions}
                            onSelectProduct={setSelectedProduct}
                        />
                    </div>
                );

            case 'stock':
                return (
                    <StockTab
                        recommendations={stockRecommendations}
                        onAddToCart={addToCart}
                        products={products}
                        days={dateRange}
                    />
                );

            case 'dormant':
                return (
                    <DormantProductsTab
                        products30={products30}
                        products7={products7}
                        relatedProducts={relatedProductsFilter}
                    />
                );

            default:
                return <OverviewTab products={displayProducts} />;
        }
    };

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 space-y-6">

            {/* 1. TOP NAVIGATION BAR (Replaces Sidebar) */}
            <header className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-4 z-30">
                <div className="flex items-center gap-4 px-4 py-2">
                    <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl">
                        A
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Analiz Paneli</h1>
                        <p className="text-xs text-slate-500">Trendyol B2B</p>
                    </div>
                </div>

                <nav className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto px-2 scrollbar-hide">
                    <NavTab id="overview" label="Genel Bakış" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
                    <NavTab id="trends" label="Trendler" icon={TrendingUp} activeTab={activeTab} onClick={setActiveTab} />
                    <NavTab id="segments" label="ABC Analizi" icon={PieChart} activeTab={activeTab} onClick={setActiveTab} />
                    <NavTab id="opportunities" label="Fırsatlar" icon={Lightbulb} activeTab={activeTab} onClick={setActiveTab} />
                    <NavTab id="stock" label="Stok" icon={Package} activeTab={activeTab} onClick={setActiveTab} />
                    <NavTab id="dormant" label="Durgun" icon={Snowflake} activeTab={activeTab} onClick={setActiveTab} />
                </nav>

                <div className="hidden xl:flex items-center gap-3 px-4 border-l border-slate-100">
                    <div className="text-right">
                        <p className="text-xs text-slate-400">Toplam Ciro</p>
                        <p className="font-bold text-slate-900">{formatCurrency(products.reduce((s, p) => s + (p.totalRevenue || 0), 0))}</p>
                    </div>
                </div>
            </header>

            {/* 2. MAIN CONTENT */}
            <main>
                {/* Header Actions (Filters) */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">
                            {activeTab === 'overview' && 'Genel Durum'}
                            {activeTab === 'trends' && 'Trend Analizi'}
                            {activeTab === 'segments' && 'ABC Müşteri Segmentasyonu'}
                            {activeTab === 'opportunities' && 'Satış Fırsatları'}
                            {activeTab === 'stock' && 'Stok Yönetimi'}
                            {activeTab === 'dormant' && 'Durgun Ürünler'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Category Filter */}
                        {categories.length > 0 && (
                            <CategoryMultiSelect
                                categories={categories}
                                selectedCategories={selectedCategories}
                                onChange={setSelectedCategories}
                            />
                        )}

                        {/* Date Filter (Only for Overview) */}
                        {activeTab === 'overview' && (
                            <div className="bg-white border border-slate-200 rounded-lg p-1 flex">
                                {([1, 7, 30, 365] as DateRange[]).map(days => (
                                    <button
                                        key={days}
                                        onClick={() => setDateRange(days)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dateRange === days ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {DATE_LABELS[days]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {products.length === 0 ? <EmptyState /> : renderContent()}
            </main>

            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </div>
    );
};

// ============================================
// HELPER COMPONENTS
// ============================================

const NavTab = ({ id, label, icon: Icon, activeTab, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === id
            ? 'bg-slate-900 text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-50'
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

const SegmentCard: React.FC<{ title: string; description: string; count: number; color: 'emerald' | 'blue' | 'amber'; isActive: boolean; onClick: () => void }> = ({ title, description, count, color, isActive, onClick }) => {
    const colors = {
        emerald: isActive ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-white text-emerald-700 border-emerald-100 hover:border-emerald-300',
        blue: isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-white text-blue-700 border-blue-100 hover:border-blue-300',
        amber: isActive ? 'bg-amber-600 text-white ring-4 ring-amber-100' : 'bg-white text-amber-700 border-amber-100 hover:border-amber-300'
    };

    return (
        <div
            onClick={onClick}
            className={`p-6 rounded-2xl border transition-all cursor-pointer shadow-sm relative overflow-hidden ${colors[color]}`}
        >
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                    <h3 className={`text-lg font-bold mb-1 ${isActive ? 'text-white' : ''}`}>{title}</h3>
                    <p className={`text-sm ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{description}</p>
                </div>
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-50'}`}>
                    {isActive ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </div>
            <div className={`text-3xl font-bold relative z-10 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {formatNumber(count)} <span className={`text-sm font-normal ${isActive ? 'text-white/70' : 'text-slate-400'}`}>Ürün</span>
            </div>
        </div>
    );
};

const YoYEmptyState = () => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="font-semibold text-slate-700">Geçmiş Veri Bulunamadı</h4>
        <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Yıllık karşılaştırma yapabilmek için lütfen Veri Yönetimi panelinden geçen yılın aynı ayına ait (Örn: Ocak 2024) satış raporunu yükleyin.
        </p>
    </div>
);

const OverviewTab: React.FC<{ products: ProductStats[] }> = ({ products }) => {
    const totalRev = products.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
    const totalQty = products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0);
    const avgPrice = totalQty > 0 ? totalRev / totalQty : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard label="Toplam Ciro" value={formatCurrency(totalRev)} icon={DollarSign} change="bu dönem" />
                <MetricCard label="Toplam Satış" value={formatNumber(totalQty) + " Adet"} icon={ShoppingBag} />
                <MetricCard label="Ort. Sepet Tutarı" value={formatCurrency(avgPrice)} icon={Target} />
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">En İyi Performans Gösterenler</h3>
                <div className="space-y-4">
                    {products
                        .sort((a, b) => b.totalRevenue - a.totalRevenue)
                        .slice(0, 5)
                        .map((p, i) => (
                            <div key={i} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">{i + 1}</div>
                                <ProductImage src={p.imageUrl} name={p.productName} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 truncate" title={p.productName}>{p.productName}</p>
                                    <p className="text-sm text-slate-500">{formatCurrency(p.totalRevenue)}</p>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: string; icon: any; change?: string }> = ({ label, value, icon: Icon, change }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Icon className="w-5 h-5" /></div>
            <span className="text-slate-500 font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {change && <div className="text-xs text-slate-400 mt-1">{change}</div>}
    </div>
);

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4"><BarChart3 className="w-8 h-8 text-slate-400" /></div>
        <h3 className="text-xl font-bold text-slate-700">Veri Bulunamadı</h3>
    </div>
);

const DormantProductsTab: React.FC<{ products30: ProductStats[], products7: ProductStats[], relatedProducts?: string[] | null }> = ({ products30, products7, relatedProducts }) => {
    const dormantProducts = useMemo(() => {
        const dormant: ProductComparison[] = [];
        for (const p30 of products30) {
            if (relatedProducts && !relatedProducts.includes(p30.modelKodu)) continue;
            const p7 = products7.find(p => p.modelKodu === p30.modelKodu);
            if ((p30.totalQuantity || 0) >= 3 && (!p7 || (p7.totalQuantity || 0) === 0)) {
                dormant.push({
                    modelKodu: p30.modelKodu, productName: p30.productName, imageUrl: p30.imageUrl, productUrl: p30.productUrl, category: p30.category, oldValue: (p30.totalRevenue || 0), newValue: 0, changePercent: -100, changeType: 'decrease', impactAmount: (p30.totalRevenue || 0), impactType: 'loss', oldQuantity: (p30.totalQuantity || 0), newQuantity: 0, segment: p30.segment
                });
            }
        }
        return dormant.sort((a, b) => b.oldValue - a.oldValue);
    }, [products30, products7, relatedProducts]);

    return (
        <div className="space-y-6">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium">Durgun Ürün Analizi</div>
            {dormantProducts.length > 0 ? (
                <ComparisonTable title="Durgun Ürünler" description="Son 30 günde satan ama son 7 günde duranlar." products={dormantProducts} analysisType="dormant-products" showImpact={true} oldPeriodLabel="Son 30 Gün" newPeriodLabel="Son 7 Gün" />
            ) : <EmptyState />}
        </div>
    );
};

const OpportunitiesTab: React.FC<any> = ({ products, onSelectProduct }) => {
    // Filter: High AddToCart but Low Sales
    const rawOpportunities = products.filter((p: ProductStats) => (p.totalAddToCart || 0) > (p.totalQuantity || 0) * 3);

    // Map to ProductComparison to avoid NaN
    const opportunities: ProductComparison[] = rawOpportunities.map((p: ProductStats) => {
        const potentialQty = Math.round((p.totalAddToCart || 0) * 0.25); // Assume 25% conversion potential
        const currentQty = p.totalQuantity || 0;
        const potentialRev = potentialQty * (p.avgUnitPrice || 0);
        const currentRev = p.totalRevenue || 0;
        const missedRev = Math.max(0, potentialRev - currentRev);

        return {
            modelKodu: p.modelKodu,
            productName: p.productName,
            imageUrl: p.imageUrl,
            productUrl: p.productUrl,
            category: p.category,
            oldValue: potentialRev,     // Shown as "Potansiyel" oldPeriodLabel
            newValue: currentRev,       // Shown as "Mevcut" newPeriodLabel
            changePercent: potentialRev > 0 ? ((currentRev - potentialRev) / potentialRev) * 100 : 0,
            changeType: 'stable',
            impactAmount: missedRev,
            impactType: 'loss', // Missed opportunity is a "loss"
            oldQuantity: potentialQty,
            newQuantity: currentQty,
            segment: p.segment
        };
    });

    return (
        <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-indigo-900 text-sm">
                    <p className="font-semibold mb-1">Hesaplama Mantığı:</p>
                    <p>
                        <strong>Potansiyel Ciro:</strong> (Sepete Ekleme Sayısı × %25 Tahmini Dönüşüm) × Ortalama Satış Fiyatı
                        <br />
                        Bu hesaplama, ürünün sepete eklenme potansiyelinin %25'inin satışa dönüşeceği varsayımıyla yapılır.
                    </p>
                </div>
            </div>
            <ComparisonTable
                title="Fırsat Ürünleri"
                description="İlgi gören ancak siparişe dönüşmeyen ürünler."
                products={opportunities}
                analysisType="opportunity"
                showImpact={true}
                oldPeriodLabel="Potansiyel"
                newPeriodLabel="Mevcut"
                impactLabel="Kaçan Ciro"
            />
        </div>
    );
};

const StockTab: React.FC<any> = ({ recommendations, products, days }) => {
    const critical = recommendations.filter((r: any) => r.urgency === 'critical');

    // Map to ProductComparison
    const mappedStock: ProductComparison[] = critical.map((rec: any) => {
        const p = products.find((prod: ProductStats) => prod.modelKodu === rec.modelKodu);
        if (!p) return null;

        const weeklySales = (p.totalQuantity || 0) / (days / 7);

        return {
            modelKodu: p.modelKodu,
            productName: p.productName,
            imageUrl: p.imageUrl,
            productUrl: p.productUrl,
            category: p.category,
            oldValue: p.currentStock || 0,   // "Stok" oldPeriodLabel
            newValue: weeklySales,           // "Satış Hızı" newPeriodLabel
            changePercent: 0,
            changeType: 'stable',
            impactAmount: 0,
            impactType: 'neutral',
            currentStock: p.currentStock,
            oldQuantity: p.currentStock,
            newQuantity: Math.round(weeklySales)
        };
    }).filter(Boolean) as ProductComparison[];

    return <ComparisonTable
        title="Kritik Stok"
        description="Tükenmek üzere olan ürünler."
        products={mappedStock}
        analysisType="stock-critical"
        showImpact={false}
        oldPeriodLabel="Mevcut Stok"
        newPeriodLabel="Haftalık Satış Hızı"
        valueFormat="number"
    />;
};

const ProductImage: React.FC<{ src?: string; name: string; size?: 'sm' | 'md' }> = ({ src, name, size = 'sm' }) => {
    const sizeClasses = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';
    if (!src) return <div className={`${sizeClasses} bg-slate-100 rounded-lg flex items-center justify-center`}><Package className="w-5 h-5 text-slate-400" /></div>;
    return <img src={src} alt={name} className={`${sizeClasses} object-cover rounded-lg`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
};

const ProductDetailModal: React.FC<{ product: ProductStats; onClose: () => void }> = ({ product, onClose }) => {
    const [aiAnalysis, setAiAnalysis] = useState<import('../services/aiService').AIAnalysisResult | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const handleAIAnalysis = async () => {
        setIsLoadingAI(true);
        try {
            const { analyzeProductPerformance } = await import('../services/aiService');
            // Safe product object
            const safeProduct = {
                ...product,
                avgUnitPrice: product.avgUnitPrice || 0,
                totalQuantity: product.totalQuantity || 0,
                totalRevenue: product.totalRevenue || 0,
                conversionRate: product.conversionRate || 0
            }
            const result = await analyzeProductPerformance(safeProduct);
            setAiAnalysis(result);
        } catch (error) { console.error(error); } finally { setIsLoadingAI(false); }
    };
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                    <h3 className="font-bold text-lg text-slate-900">Ürün Analizi</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex gap-4">
                        <ProductImage src={product.imageUrl} name={product.productName} size="md" />
                        <div><h4 className="font-semibold text-slate-900">{product.productName}</h4><p className="text-sm text-slate-500">{product.modelKodu}</p></div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <MetricCard label="Görüntülenme" value={formatNumber(product.totalImpressions || 0)} icon={Eye} />
                        <MetricCard label="Sepete Ekleme" value={formatNumber(product.totalAddToCart || 0)} icon={ShoppingCart} />
                        <MetricCard label="Satış" value={formatNumber(product.totalQuantity || 0)} icon={Target} />
                        <MetricCard label="Ciro" value={formatCurrency(product.totalRevenue || 0)} icon={DollarSign} />
                    </div>
                    {!aiAnalysis && (
                        <button onClick={handleAIAnalysis} disabled={isLoadingAI} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2">
                            {isLoadingAI ? 'Analiz Ediliyor...' : 'Yapay Zeka Yorumu Al'}
                        </button>
                    )}
                    {aiAnalysis && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                            <h5 className="font-bold text-indigo-900 mb-2">✨ Yapay Zeka Analizi</h5>
                            <p className="text-indigo-800 mb-4 text-sm">{aiAnalysis.analysis}</p>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-indigo-500 uppercase">Aksiyonlar</p>
                                {aiAnalysis.actionable_steps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm text-indigo-900"><span className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>{step}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisView;
