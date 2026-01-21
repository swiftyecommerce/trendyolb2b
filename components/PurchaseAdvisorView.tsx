import React, { useMemo, useState } from 'react';
import {
    ShoppingBag, AlertOctagon, TrendingUp, TrendingDown,
    ChevronRight, DollarSign, Package, ShoppingCart,
    CheckCircle, X
} from 'lucide-react';
import { NotificationCategory, ProductStats, AppTab } from '../types';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatCurrency, formatNumber } from '../lib/excelParser';
import { calculateProductTrends } from '../lib/notificationEngine';

// ============================================
// TYPES
// ============================================

interface AdvisorItem {
    id: string;
    productName: string;
    imageUrl?: string;
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

const PurchaseAdvisorView: React.FC = () => {
    const { state, getProductsByPeriod, addToCart } = useAnalytics();
    const [activeTab, setActiveTab] = useState<'buy' | 'avoid'>('buy');

    // Calculate recommendations
    const advisorData = useMemo(() => {
        const products30 = getProductsByPeriod(30);
        const products7 = getProductsByPeriod(7);
        const trends = calculateProductTrends(products7, products30);

        const buyList: AdvisorItem[] = [];
        const avoidList: AdvisorItem[] = [];

        state.products.forEach(product => {
            const stats30 = products30.find(p => p.modelKodu === product.modelKodu);
            const stats7 = products7.find(p => p.modelKodu === product.modelKodu);
            const trend = trends.find(t => t.modelKodu === product.modelKodu)?.shortTermChange || 0;

            const dailySales = (stats30?.totalQuantity || 0) / 30;
            const currentStock = product.currentStock || 0;
            const avgUnitPrice = product.avgUnitPrice || 0;

            // Eğer hiç satış yoksa ve stok varsa -> ALMA
            if (dailySales === 0 && currentStock > 0) {
                avoidList.push({
                    id: product.modelKodu,
                    productName: product.productName,
                    imageUrl: product.imageUrl,
                    currentStock,
                    dailySales: 0,
                    weeklySales: stats7?.totalQuantity || 0,
                    monthlySales: stats30?.totalQuantity || 0,
                    trend,
                    avgUnitPrice,
                    recommendedBuy: 0,
                    reason: "Hiç satış yok, stok fazlası",
                    priority: 'high'
                });
                return;
            }

            // Stok gün sayısını hesapla
            const daysOfStock = dailySales > 0 ? currentStock / dailySales : 999;

            // 1. ALMA Kriterleri (Stok Fazlası veya Düşen Trend)
            if (daysOfStock > 60 || (trend < -50 && daysOfStock > 30)) {
                avoidList.push({
                    id: product.modelKodu,
                    productName: product.productName,
                    imageUrl: product.imageUrl,
                    currentStock,
                    dailySales,
                    weeklySales: stats7?.totalQuantity || 0,
                    monthlySales: stats30?.totalQuantity || 0,
                    trend,
                    avgUnitPrice,
                    recommendedBuy: 0,
                    reason: daysOfStock > 60
                        ? `${Math.round(daysOfStock)} günlük stok var (Fazla)`
                        : "Satışlar ciddi düşüşte (-%" + Math.abs(Math.round(trend)) + ")",
                    priority: daysOfStock > 90 ? 'high' : 'medium'
                });
                return;
            }

            // 2. AL Kriterleri (Stok Az veya Yükselen Trend)
            // Hedef stok: (Günlük Satış * 30)
            const targetStock = dailySales * TARGET_DAYS_COVERAGE;
            const safetyStock = dailySales * SAFETY_STOCK_DAYS;

            if (currentStock < targetStock) {
                // Alınması gereken = Hedef - Mevcut
                let toBuy = Math.ceil(targetStock - currentStock);

                // Trend pozitifse %20 artır
                if (trend > 20) toBuy = Math.ceil(toBuy * 1.2);

                if (toBuy > 0) {
                    buyList.push({
                        id: product.modelKodu,
                        productName: product.productName,
                        imageUrl: product.imageUrl,
                        currentStock,
                        dailySales,
                        weeklySales: stats7?.totalQuantity || 0,
                        monthlySales: stats30?.totalQuantity || 0,
                        trend,
                        avgUnitPrice,
                        recommendedBuy: toBuy,
                        reason: currentStock === 0
                            ? "Stok bitti! Acil sipariş gerekli."
                            : `${Math.round(daysOfStock)} günlük stok kaldı. 30 güne tamamla.`,
                        priority: currentStock < safetyStock ? 'high' : 'medium',
                        profitPotential: toBuy * (avgUnitPrice * 0.3) // Tahmini kar
                    });
                }
            }
        });

        // Sort lists
        buyList.sort((a, b) => (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0) || b.dailySales - a.dailySales);
        avoidList.sort((a, b) => b.currentStock - a.currentStock);

        return { buyList, avoidList };
    }, [state.products, getProductsByPeriod]);

    return (
        <div className="max-w-6xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-7 h-7 text-indigo-600" />
                    Satın Alma Danışmanı
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Stok/Satış analizine göre akıllı sipariş önerileri
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div
                    onClick={() => setActiveTab('buy')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${activeTab === 'buy'
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-1 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-indigo-200'
                        }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="font-bold text-slate-700">ALINMALI</h3>
                        </div>
                        <span className="text-2xl font-black text-slate-900">{advisorData.buyList.length}</span>
                    </div>
                    <p className="text-sm text-slate-500">
                        Yüksek potansiyelli ve stoğu azalan ürünler
                    </p>
                </div>

                <div
                    onClick={() => setActiveTab('avoid')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${activeTab === 'avoid'
                        ? 'border-red-500 bg-red-50/50 shadow-md ring-1 ring-red-200'
                        : 'border-slate-200 bg-white hover:border-red-200'
                        }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertOctagon className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="font-bold text-slate-700">ALINMAMALI</h3>
                        </div>
                        <span className="text-2xl font-black text-slate-900">{advisorData.avoidList.length}</span>
                    </div>
                    <p className="text-sm text-slate-500">
                        Stok fazlası veya satışı durmuş ürünler
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className={`px-6 py-4 border-b border-slate-200 flex items-center justify-between ${activeTab === 'buy' ? 'bg-indigo-50' : 'bg-red-50'
                    }`}>
                    <h2 className={`font-bold text-lg ${activeTab === 'buy' ? 'text-indigo-900' : 'text-red-900'
                        }`}>
                        {activeTab === 'buy' ? 'Sipariş Önerileri' : 'Riskli Ürünler'}
                    </h2>
                    <span className="text-sm font-medium opacity-70">
                        {activeTab === 'buy'
                            ? `${advisorData.buyList.reduce((acc, i) => acc + i.recommendedBuy, 0)} adet ürün gerekli`
                            : 'Stok eritme stratejisi gerekli'}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-300 bg-slate-800 text-white">
                                <th className="py-4 px-6 font-semibold text-sm border-r border-slate-700">Ürün</th>
                                <th className="py-4 px-6 font-semibold text-sm text-center border-r border-slate-700">Mevcut Stok</th>
                                <th className="py-4 px-6 font-semibold text-sm text-center border-r border-slate-700">Aylık Satış</th>
                                <th className="py-4 px-6 font-semibold text-sm border-r border-slate-700">Analiz / Neden</th>
                                {activeTab === 'buy' && (
                                    <>
                                        <th className="py-4 px-6 font-semibold text-sm text-center bg-indigo-700 border-r border-indigo-800">Önerilen</th>
                                        <th className="py-4 px-6 font-semibold text-sm text-right">Aksiyon</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {(activeTab === 'buy' ? advisorData.buyList : advisorData.avoidList).map((item, idx) => (
                                <tr key={item.id} className={`hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
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
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-slate-500">{item.id}</span>
                                                    {item.priority === 'high' && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">KRİTİK</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center border-r border-slate-200">
                                        <span className={`font-semibold ${item.currentStock === 0 ? 'text-red-600' : 'text-slate-700'}`}>
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
                                        {item.profitPotential && (
                                            <p className="text-xs text-emerald-600 mt-1 font-medium">
                                                ~{formatCurrency(item.profitPotential)} potansiyel ciro
                                            </p>
                                        )}
                                    </td>
                                    {activeTab === 'buy' && (
                                        <>
                                            <td className="py-4 px-6 text-center bg-indigo-50/10 border-r border-indigo-100">
                                                <span className="text-lg font-black text-indigo-600">
                                                    +{item.recommendedBuy}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => addToCart({
                                                        modelKodu: item.id,
                                                        productName: item.productName,
                                                        imageUrl: item.imageUrl,
                                                        avgUnitPrice: item.avgUnitPrice,
                                                        // Partial object cast to ProductStats
                                                    } as unknown as ProductStats, item.recommendedBuy)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                                                >
                                                    <ShoppingCart className="w-4 h-4" />
                                                    Sepete Ekle
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PurchaseAdvisorView;
