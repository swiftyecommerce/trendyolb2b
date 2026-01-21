import React, { useMemo, useState } from 'react';
import {
    Lightbulb, Package, ImageIcon, DollarSign, Percent, Eye,
    Archive, Gift, ChevronRight, CheckCircle, AlertTriangle,
    TrendingUp, X, Sparkles
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import {
    generateAllRecommendations,
    getTopRecommendationsSummary,
    type Recommendation,
    type RecommendationType,
    type ProductRecommendations
} from '../lib/recommendationEngine';
import { calculateProductTrends } from '../lib/notificationEngine';
import { formatCurrency, formatNumber } from '../lib/excelParser';

// ============================================
// TYPE ICONS & COLORS
// ============================================

const TYPE_CONFIG: Record<RecommendationType, { icon: React.FC<any>; color: string; bgColor: string; label: string }> = {
    'restock': { icon: Package, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Stok Yenile' },
    'price-review': { icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'Fiyat Gözden Geçir' },
    'visual-update': { icon: ImageIcon, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Görsel Güncelle' },
    'promotion': { icon: Percent, color: 'text-pink-600', bgColor: 'bg-pink-100', label: 'Kampanya Öner' },
    'boost-visibility': { icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Görünürlük Artır' },
    'archive': { icon: Archive, color: 'text-slate-600', bgColor: 'bg-slate-100', label: 'Arşivle' },
    'bundle': { icon: Gift, color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Paket Oluştur' },
    'cross-sell': { icon: TrendingUp, color: 'text-indigo-600', bgColor: 'bg-indigo-100', label: 'Çapraz Satış' }
};

// ============================================
// RECOMMENDATION CARD
// ============================================

interface RecommendationCardProps {
    recommendation: Recommendation;
    onExpand?: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onExpand }) => {
    const config = TYPE_CONFIG[recommendation.type];
    const Icon = config.icon;

    return (
        <div
            className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${recommendation.urgency === 'critical' ? 'border-red-200 bg-red-50/50' :
                recommendation.urgency === 'high' ? 'border-amber-200 bg-amber-50/50' :
                    'border-slate-200 bg-white'
                }`}
            onClick={onExpand}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                            {config.label}
                        </span>
                        {recommendation.urgency === 'critical' && (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        )}
                    </div>

                    <h4 className="font-semibold text-slate-900 text-sm">{recommendation.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{recommendation.description}</p>

                    {/* Product name */}
                    <p className="text-xs text-slate-400 mt-2 truncate">
                        📦 {recommendation.productName}
                    </p>

                    {/* Impact */}
                    {recommendation.estimatedImpact && (
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                            💰 {recommendation.estimatedImpact}
                        </p>
                    )}
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </div>
        </div>
    );
};

// ============================================
// RECOMMENDATION DETAIL MODAL
// ============================================

interface RecommendationDetailModalProps {
    recommendation: Recommendation;
    onClose: () => void;
    onApply?: () => void;
}

const RecommendationDetailModal: React.FC<RecommendationDetailModalProps> = ({
    recommendation, onClose, onApply
}) => {
    const config = TYPE_CONFIG[recommendation.type];
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`px-6 py-4 border-b ${recommendation.urgency === 'critical' ? 'bg-red-50' :
                    recommendation.urgency === 'high' ? 'bg-amber-50' :
                        'bg-slate-50'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                                <Icon className={`w-6 h-6 ${config.color}`} />
                            </div>
                            <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                    {config.label}
                                </span>
                                <h3 className="font-bold text-slate-900 mt-1">{recommendation.title}</h3>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Product */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Package className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">Ürün</p>
                            <p className="font-medium text-slate-900">{recommendation.productName}</p>
                            <p className="text-xs text-slate-400">{recommendation.productId}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Durum</h4>
                        <p className="text-sm text-slate-600">{recommendation.description}</p>
                    </div>

                    {/* Reason */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Neden Bu Öneri?</h4>
                        <p className="text-sm text-slate-600">{recommendation.reason}</p>
                    </div>

                    {/* Impact */}
                    {recommendation.estimatedImpact && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-emerald-600" />
                                <span className="font-semibold text-emerald-700">Tahmini Etki</span>
                            </div>
                            <p className="text-emerald-600 mt-1">{recommendation.estimatedImpact}</p>
                        </div>
                    )}

                    {/* Action Steps */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Aksiyon Adımları</h4>
                        <div className="space-y-2">
                            {recommendation.actionSteps.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-bold text-indigo-600">{idx + 1}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-white transition-colors"
                    >
                        Kapat
                    </button>
                    <button
                        onClick={() => { onApply?.(); onClose(); }}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Uygulandı
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// RECOMMENDATIONS PANEL (Dashboard Widget)
// ============================================

interface RecommendationsPanelProps {
    maxItems?: number;
    showHeader?: boolean;
}

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
    maxItems = 5,
    showHeader = true
}) => {
    const { getProductsByPeriod, getStockRecommendations } = useAnalytics();
    const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);

    // Generate recommendations
    const allRecommendations = useMemo(() => {
        const products30 = getProductsByPeriod(30);
        const products7 = getProductsByPeriod(7);
        const stockRecs = getStockRecommendations(30);
        const trends = calculateProductTrends(products7, products30);

        return generateAllRecommendations(products30, stockRecs, trends);
    }, [getProductsByPeriod, getStockRecommendations]);

    const summary = useMemo(() =>
        getTopRecommendationsSummary(allRecommendations),
        [allRecommendations]
    );

    // Flatten and get top recommendations
    const topRecommendations = useMemo(() => {
        return allRecommendations
            .flatMap(p => p.recommendations)
            .sort((a, b) => b.impactScore - a.impactScore)
            .slice(0, maxItems);
    }, [allRecommendations, maxItems]);

    if (topRecommendations.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 mb-3" />
                    <h3 className="font-semibold text-slate-700">Harika!</h3>
                    <p className="text-sm text-slate-500 mt-1">Şu an için aksiyon gerektiren ürün yok.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {showHeader && (
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">AI Önerileri</h3>
                                <p className="text-xs text-slate-500">{summary.totalProducts} ürün için aksiyon önerisi</p>
                            </div>
                        </div>

                        {/* Summary badges */}
                        <div className="flex gap-2">
                            {summary.criticalCount > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                    {summary.criticalCount} ACİL
                                </span>
                            )}
                            {summary.highCount > 0 && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                    {summary.highCount} ÖNEMLİ
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendation List */}
            <div className="p-4 space-y-3">
                {topRecommendations.map(rec => (
                    <RecommendationCard
                        key={rec.id}
                        recommendation={rec}
                        onExpand={() => setSelectedRec(rec)}
                    />
                ))}
            </div>

            {/* View All Link */}
            {allRecommendations.length > maxItems && (
                <div className="px-4 pb-4">
                    <button className="w-full py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors">
                        Tüm önerileri gör ({allRecommendations.flatMap(p => p.recommendations).length})
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedRec && (
                <RecommendationDetailModal
                    recommendation={selectedRec}
                    onClose={() => setSelectedRec(null)}
                />
            )}
        </div>
    );
};

export default RecommendationsPanel;
