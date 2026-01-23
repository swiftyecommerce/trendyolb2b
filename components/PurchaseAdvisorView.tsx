import React, { useMemo, useState } from 'react';
import {
    ShoppingBag, AlertOctagon, TrendingUp, TrendingDown,
    ChevronRight, DollarSign, Package, ShoppingCart,
    CheckCircle, X, ExternalLink
} from 'lucide-react';
import { NotificationCategory, ProductStats, AppTab } from '../types';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatCurrency, formatNumber } from '../lib/excelParser';
import { calculateProductTrends } from '../lib/notificationEngine';
import AddToCartControl from './AddToCartControl';

// ============================================
// TYPES
// ============================================

interface AdvisorItem {
    id: string;
    productName: string;
    imageUrl?: string;
    productUrl?: string;
    currentStock: number;
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
    trend: number;
    avgUnitPrice: number; // Added for cart

    // Purchase specific
    recommendedBuy: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    profitPotential?: number;
}

// ============================================
// HELPER LOGIC
// ============================================

const TARGET_DAYS_COVERAGE = 30; // Hedeflenen stok gün sayısı
const SAFETY_STOCK_DAYS = 7;     // Güvenlik stoku

// ============================================
// COMPONENT
// ============================================

const ITEMS_PER_PAGE = 50;

const PurchaseAdvisorView: React.FC = () => {
    const { state, getProductsByPeriod, addToCart } = useAnalytics();
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdvisorItem; direction: 'asc' | 'desc' } | null>({ key: 'recommendedBuy', direction: 'desc' });

    // Calculate recommendations
    const allProducts = useMemo(() => {
        const products30 = getProductsByPeriod(30);
        const products7 = getProductsByPeriod(7);
        const trends = calculateProductTrends(products7, products30);

        const list: AdvisorItem[] = [];

        state.products.forEach(product => {
            const stats30 = products30.find(p => p.modelKodu === product.modelKodu);
            const stats7 = products7.find(p => p.modelKodu === product.modelKodu);
            const trend = trends.find(t => t.modelKodu === product.modelKodu)?.shortTermChange || 0;

            const dailySales = (stats30?.totalQuantity || 0) / 30;
            const currentStock = product.currentStock || 0;
            const avgUnitPrice = product.avgUnitPrice || 0;

            // Hedef stok: (Günlük Satış * 30)
            const targetStock = dailySales * TARGET_DAYS_COVERAGE;

            // Önerilen: Hedef stok kadar (Mevcut stoktan bağımsız)
            let recommendedBuy = Math.ceil(targetStock);

            // Trend pozitifse %20 artır
            if (trend > 20) recommendedBuy = Math.ceil(recommendedBuy * 1.2);

            // Neden metni oluştur
            let reason = "";
            let priority: 'high' | 'medium' | 'low' = 'low';

            if (dailySales === 0) {
                reason = "Satış yok";
                priority = 'low';
            } else {
                const trendText = trend > 20 ? " (Yükselen Trend)" : trend < -20 ? " (Düşen Trend)" : "";
                reason = `Aylık ortalama ${Math.round(stats30?.totalQuantity || 0)} satış${trendText}`;

                // Öncelik belirleme (Ciro potansiyeline göre)
                const potentialRevenue = recommendedBuy * avgUnitPrice;
                if (potentialRevenue > 10000) priority = 'high';
                else if (potentialRevenue > 2000) priority = 'medium';
            }

            list.push({
                id: product.modelKodu,
                productName: product.productName,
                imageUrl: product.imageUrl,
                productUrl: product.productUrl,
                currentStock,
                dailySales,
                weeklySales: stats7?.totalQuantity || 0,
                monthlySales: stats30?.totalQuantity || 0,
                trend,
                avgUnitPrice,
                recommendedBuy,
                reason,
                priority,
                profitPotential: recommendedBuy * (avgUnitPrice * 0.3)
            });
        });

        // Sort
        if (sortConfig) {
            list.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === undefined || bValue === undefined) return 0;

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return list;
    }, [state.products, getProductsByPeriod, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(allProducts.length / ITEMS_PER_PAGE);
    const displayedProducts = allProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleSort = (key: keyof AdvisorItem) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="max-w-7xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-7 h-7 text-indigo-600" />
                    Satın Alma Danışmanı
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Satış hızına göre ideal stok önerileri (Tüm Ürünler)
                </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h2 className="font-bold text-lg text-slate-800">
                        Tüm Ürün Listesi ({formatNumber(allProducts.length)})
                    </h2>
                    <span className="text-sm font-medium text-slate-500">
                        Sayfa {currentPage} / {totalPages}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-300 bg-slate-800 text-white">
                                <th className="py-4 px-6 font-semibold text-sm border-r border-slate-700">Ürün</th>
                                <th
                                    className="py-4 px-6 font-semibold text-sm text-center border-r border-slate-700 cursor-pointer hover:bg-slate-700"
                                    onClick={() => handleSort('currentStock')}
                                >
                                    Mevcut Stok {sortConfig?.key === 'currentStock' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                </th>
                                <th
                                    className="py-4 px-6 font-semibold text-sm text-center border-r border-slate-700 cursor-pointer hover:bg-slate-700"
                                    onClick={() => handleSort('monthlySales')}
                                >
                                    Aylık Satış {sortConfig?.key === 'monthlySales' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                </th>
                                <th className="py-4 px-6 font-semibold text-sm border-r border-slate-700">Analiz / Potansiyel</th>
                                <th
                                    className="py-4 px-6 font-semibold text-sm text-center bg-indigo-700 border-r border-indigo-800 cursor-pointer hover:bg-indigo-600"
                                    onClick={() => handleSort('recommendedBuy')}
                                >
                                    Olması Gereken {sortConfig?.key === 'recommendedBuy' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                                </th>
                                <th className="py-4 px-6 font-semibold text-sm text-right">Aksiyon</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {displayedProducts.map((item, idx) => (
                                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                    <td className="py-4 px-6 border-r border-slate-200">
                                        <div className="flex items-center gap-3">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-slate-900 line-clamp-1">{item.productName}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-xs text-slate-500">{item.id}</span>
                                                    {item.productUrl && (
                                                        <a
                                                            href={item.productUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-500 hover:text-indigo-600"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center border-r border-slate-200">
                                        <span className={`font-semibold ${item.currentStock === 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                            {item.currentStock}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center border-r border-slate-200">
                                        <div className="flex flex-col items-center">
                                            <span className="font-semibold text-slate-900">{Math.round(item.monthlySales)}</span>
                                            {item.trend !== 0 && (
                                                <span className={`text-xs font-bold flex items-center ${item.trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {item.trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                                    %{Math.abs(Math.round(item.trend))}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 border-r border-slate-200">
                                        <p className="text-sm font-medium text-slate-700">{item.reason}</p>
                                    </td>
                                    <td className="py-4 px-6 text-center bg-indigo-50/10 border-r border-indigo-100">
                                        <span className="text-lg font-black text-indigo-600">
                                            {item.recommendedBuy}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end">
                                            <AddToCartControl
                                                product={{
                                                    modelKodu: item.id,
                                                    productName: item.productName,
                                                    imageUrl: item.imageUrl,
                                                    productUrl: item.productUrl,
                                                    avgUnitPrice: item.avgUnitPrice,
                                                    totalQuantity: 0,
                                                    totalRevenue: 0,
                                                    currentStock: item.currentStock,
                                                    totalImpressions: 0,
                                                    totalAddToCart: 0,
                                                    totalFavorites: 0,
                                                    viewToCartRate: 0,
                                                    cartToSaleRate: 0,
                                                    conversionRate: 0,
                                                    segment: 'B' // Dummy
                                                } as unknown as ProductStats}
                                                initialQuantity={item.recommendedBuy > 0 ? item.recommendedBuy : 1}
                                                onAdd={(p, q) => addToCart(p, q)}
                                                compact={false}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Önceki Sayfa
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Show pages around current page
                            let pageNum = currentPage;
                            if (currentPage < 3) pageNum = i + 1;
                            else if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;

                            if (pageNum < 1 || pageNum > totalPages) return null;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${currentPage === pageNum
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sonraki Sayfa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseAdvisorView;
