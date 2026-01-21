import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Eye,
  Target, BarChart3, Package, ArrowRight, Filter
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatCurrency, formatNumber, formatPercent } from '../lib/excelParser';
import { AppTab } from '../types';
import CategoryMultiSelect from './CategoryMultiSelect';
import RecommendationsPanel from './RecommendationsPanel';

interface DashboardProps {
  onNavigateToTab?: (tab: AppTab) => void;
}

type DateRange = 1 | 7 | 30 | 365;

const DATE_LABELS: Record<DateRange, string> = {
  1: '1 Gün',
  7: '7 Gün',
  30: '30 Gün',
  365: '1 Yıl'
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTab }) => {
  const { getKPIsForPeriod, getProductsByPeriod, hasDataForPeriod, categories, state } = useAnalytics();
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Initialize selected categories to all when categories load
  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories([...categories]);
    }
  }, [categories]);

  // Get all products for the period, then filter by selected categories
  const allProducts = useMemo(() => {
    return getProductsByPeriod(dateRange, undefined);
  }, [getProductsByPeriod, dateRange]);

  // Filter products by selected categories
  const products = useMemo(() => {
    if (selectedCategories.length === 0 || selectedCategories.length === categories.length) {
      return allProducts;
    }
    return allProducts.filter(p => p.category && selectedCategories.includes(p.category));
  }, [allProducts, selectedCategories, categories.length]);

  // Calculate KPIs from filtered products
  const kpis = useMemo(() => {
    const totalRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);
    const totalQuantity = products.reduce((s, p) => s + p.totalQuantity, 0);
    const totalImpressions = products.reduce((s, p) => s + p.totalImpressions, 0);
    const totalAddToCart = products.reduce((s, p) => s + p.totalAddToCart, 0);
    const lowStockCount = products.filter(p =>
      p.currentStock !== null && p.currentStock !== undefined && p.currentStock < 10 && p.totalQuantity > 0
    ).length;

    return {
      totalRevenue,
      totalQuantity,
      totalImpressions,
      totalAddToCart,
      productCount: products.length,
      lowStockCount,
      conversionRate: totalImpressions > 0 ? (totalQuantity / totalImpressions) * 100 : 0,
      aov: totalQuantity > 0 ? totalRevenue / totalQuantity : 0
    };
  }, [products]);

  // Check which periods have data
  const periodAvailability = useMemo(() => ({
    1: hasDataForPeriod(1),
    7: hasDataForPeriod(7),
    30: hasDataForPeriod(30),
    365: hasDataForPeriod(365)
  }), [hasDataForPeriod]);

  // Top lists
  const topByCiro = useMemo(() =>
    [...products].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5),
    [products]
  );

  const topBySales = useMemo(() =>
    [...products].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5),
    [products]
  );

  const topByConversion = useMemo(() =>
    products.filter(p => p.totalImpressions > 100)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5),
    [products]
  );

  const hasData = products.length > 0;
  const excludedCount = categories.length - selectedCategories.length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {hasData
              ? `${formatNumber(kpis.productCount)} ürün • ${DATE_LABELS[dateRange]}${excludedCount > 0 ? ` • ${excludedCount} kategori hariç` : ''}`
              : 'Veri yüklemek için Veri Yönetimi\'ne gidin'
            }
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Category Multi-Select */}
          {categories.length > 0 && (
            <CategoryMultiSelect
              categories={categories}
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
            />
          )}

          {/* Date Range Filter */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {([1, 7, 30, 365] as DateRange[]).map(days => (
              <button
                key={days}
                onClick={() => setDateRange(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${dateRange === days
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : periodAvailability[days]
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400'
                  }`}
              >
                {DATE_LABELS[days]}
                {periodAvailability[days] && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Toplam Ciro"
          value={formatCurrency(kpis.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
        <KPICard
          title="Satış Adedi"
          value={formatNumber(kpis.totalQuantity)}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="blue"
        />
        <KPICard
          title="Görüntülenme"
          value={formatNumber(kpis.totalImpressions)}
          icon={<Eye className="w-5 h-5" />}
          color="purple"
        />
        <KPICard
          title="Dönüşüm Oranı"
          value={formatPercent(kpis.conversionRate)}
          icon={<Target className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Ort. Sipariş Değeri</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(kpis.aov)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Sepete Ekleme</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatNumber(kpis.totalAddToCart)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Toplam Ürün</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatNumber(kpis.productCount)}</p>
        </div>
        <div className={`rounded-xl p-4 border ${kpis.lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm ${kpis.lowStockCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>Düşük Stoklu</p>
          <p className={`text-xl font-bold mt-1 ${kpis.lowStockCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {formatNumber(kpis.lowStockCount)}
          </p>
        </div>
      </div>

      {/* Top Lists */}
      {hasData && (
        <div className="grid grid-cols-3 gap-6">
          <TopList
            title="En Çok Ciro"
            items={topByCiro}
            valueKey="totalRevenue"
            formatValue={formatCurrency}
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          />
          <TopList
            title="En Çok Satış"
            items={topBySales}
            valueKey="totalQuantity"
            formatValue={(v) => `${formatNumber(v)} adet`}
            icon={<ShoppingCart className="w-4 h-4 text-blue-600" />}
          />
          <TopList
            title="En Yüksek Dönüşüm"
            items={topByConversion}
            valueKey="conversionRate"
            formatValue={(v) => formatPercent(v)}
            icon={<Target className="w-4 h-4 text-amber-600" />}
          />
        </div>
      )}

      {/* AI Recommendations Panel */}
      {hasData && (
        <RecommendationsPanel maxItems={5} showHeader={true} />
      )}

      {/* Empty State */}
      {!hasData && (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <BarChart3 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Veri Bulunamadı</h3>
          <p className="text-slate-500 mb-6">
            Analiz yapmak için önce Excel dosyalarınızı yükleyin
          </p>
          <button
            onClick={() => onNavigateToTab?.(AppTab.DATA_MANAGEMENT)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Veri Yükle
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Actions */}
      {hasData && (
        <div className="flex gap-4">
          <button
            onClick={() => onNavigateToTab?.(AppTab.ANALYSIS)}
            className="flex-1 flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6" />
              <div className="text-left">
                <p className="font-semibold">Detaylı Analiz</p>
                <p className="text-sm opacity-80">Stok önerileri, fırsat analizi</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => onNavigateToTab?.(AppTab.PRODUCTS)}
            className="flex-1 flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6" />
              <div className="text-left">
                <p className="font-semibold">Ürün Listesi</p>
                <p className="text-sm opacity-80">Filtrele ve sepete ekle</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  return (
    <div className={`rounded-xl p-5 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
          <span className="text-slate-400 ml-1">önceki dönem</span>
        </div>
      )}
    </div>
  );
};

// Product Image Component
const ProductImage: React.FC<{ src?: string; name: string }> = ({ src, name }) => {
  if (!src) {
    return (
      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Package className="w-5 h-5 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

// Top List Component
interface TopListProps {
  title: string;
  items: any[];
  valueKey: string;
  formatValue: (value: number) => string;
  icon: React.ReactNode;
}

const TopList: React.FC<TopListProps> = ({ title, items, valueKey, formatValue, icon }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
        {icon}
        <h3 className="font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => (
          <div key={item.modelKodu} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' :
              idx === 1 ? 'bg-slate-200 text-slate-600' :
                idx === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-500'
              }`}>
              {idx + 1}
            </span>
            <ProductImage src={item.imageUrl} name={item.productName} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.productName}</p>
              <p className="text-xs text-slate-500">{item.modelKodu}</p>
            </div>
            <span className="text-sm font-semibold text-slate-700 flex-shrink-0">
              {formatValue(item[valueKey])}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-4 py-6 text-center text-slate-400 text-sm">Veri yok</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
