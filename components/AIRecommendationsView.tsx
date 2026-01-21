import React, { useMemo, useState } from 'react';
import {
    Lightbulb, Package, ImageIcon, DollarSign, Percent, Eye,
    Archive, Gift, CheckCircle, AlertTriangle,
    TrendingUp, TrendingDown, Sparkles, Filter,
    ChevronRight, X, Search
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import {
    generateAllRecommendations,
    getTopRecommendationsSummary,
    type Recommendation,
    type RecommendationType,
    type RecommendationUrgency,
    type ProductRecommendations
} from '../lib/recommendationEngine';
import { calculateProductTrends } from '../lib/notificationEngine';
import { formatCurrency, formatNumber } from '../lib/excelParser';

// ============================================
// TYPE CONFIG
// ============================================

const TYPE_CONFIG: Record<RecommendationType, {
    icon: React.FC<any>;
    color: string;
    bgColor: string;
    label: string;
    description: string;
}> = {
    'restock': {
        icon: Package,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Stok Yenile',
        description: 'Stok seviyesi kritik ürünler'
    },
    'price-review': {
        icon: DollarSign,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        label: 'Fiyat Gözden Geçir',
        description: 'Sepet terk sorunu olan ürünler'
    },
    'visual-update': {
        icon: ImageIcon,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        label: 'Görsel Güncelle',
        description: 'Düşük tıklama/sepet oranı'
    },
    'promotion': {
        icon: Percent,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
        label: 'Kampanya Öner',
        description: 'Soğuyan ürünleri canlandır'
    },
    'boost-visibility': {
        icon: Eye,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Görünürlük Artır',
        description: 'Az görüntülenen potansiyel ürünler'
    },
    'archive': {
        icon: Archive,
        color: 'text-slate-600',
        bgColor: 'bg-slate-100',
        label: 'Arşivle',
        description: 'Uzun süredir satmayan ürünler'
    },
    'bundle': {
        icon: Gift,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        label: 'Paket Oluştur',
        description: 'Birlikte satılabilecek ürünler'
    },
    'cross-sell': {
        icon: TrendingUp,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        label: 'Çapraz Satış',
        description: 'Cross-sell fırsatları'
    }
};

const URGENCY_CONFIG: Record<RecommendationUrgency, { label: string; color: string; bgColor: string }> = {
    'critical': { label: 'ACİL', color: 'text-red-700', bgColor: 'bg-red-100' },
    'high': { label: 'ÖNEMLİ', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    'medium': { label: 'ORTA', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    'low': { label: 'DÜŞÜK', color: 'text-slate-600', bgColor: 'bg-slate-100' }
};

// ============================================
// RECOMMENDATION CARD
// ============================================

interface RecommendationCardProps {
    recommendation: Recommendation;
    onExpand: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onExpand }) => {
    const typeConfig = TYPE_CONFIG[recommendation.type];
    const urgencyConfig = URGENCY_CONFIG[recommendation.urgency];
    const Icon = typeConfig.icon;

    return (
        <div
            onClick={onExpand}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${recommendation.urgency === 'critical' ? 'border-red-200 bg-red-50/30' :
                    recommendation.urgency === 'high' ? 'border-amber-200 bg-amber-50/30' :
                        'border-slate-200 bg-white hover:border-indigo-200'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                            {typeConfig.label}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgencyConfig.bgColor} ${urgencyConfig.color}`}>
                            {urgencyConfig.label}
                        </span>
                    </div>

                    <h4 className="font-semibold text-slate-900">{recommendation.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{recommendation.description}</p>

                    <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">
                            📦 {recommendation.productName}
                        </p>
                        {recommendation.estimatedImpact && (
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                💰 {recommendation.estimatedImpact}
                            </span>
                        )}
                    </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
            </div>
        </div>
    );
};

// ============================================
// DETAIL MODAL
// ============================================

interface DetailModalProps {
    recommendation: Recommendation;
    onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ recommendation, onClose }) => {
    const typeConfig = TYPE_CONFIG[recommendation.type];
    const Icon = typeConfig.icon;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`px-6 py-4 border-b ${recommendation.urgency === 'critical' ? 'bg-red-50' :
                        recommendation.urgency === 'high' ? 'bg-amber-50' : 'bg-slate-50'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${typeConfig.bgColor} flex items-center justify-center`}>
                                <Icon className={`w-6 h-6 ${typeConfig.color}`} />
                            </div>
                            <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                                    {typeConfig.label}
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
                        onClick={onClose}
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
// MAIN COMPONENT
// ============================================

const AIRecommendationsView: React.FC = () => {
    const { getProductsByPeriod, getStockRecommendations, state } = useAnalytics();
    const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
    const [typeFilter, setTypeFilter] = useState<RecommendationType | 'all'>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<RecommendationUrgency | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Generate ALL recommendations
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

    // Flatten all recommendations
    const allRecs = useMemo(() =>
        allRecommendations.flatMap(p => p.recommendations),
        [allRecommendations]
    );

    // Apply filters
    const filteredRecs = useMemo(() => {
        let result = allRecs;

        if (typeFilter !== 'all') {
            result = result.filter(r => r.type === typeFilter);
        }

        if (urgencyFilter !== 'all') {
            result = result.filter(r => r.urgency === urgencyFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.productName.toLowerCase().includes(q) ||
                r.productId.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q)
            );
        }

        return result.sort((a, b) => b.impactScore - a.impactScore);
    }, [allRecs, typeFilter, urgencyFilter, searchQuery]);

    // Group by type for stats
    const typeStats = useMemo(() => {
        const stats: Record<string, number> = {};
        allRecs.forEach(r => {
            stats[r.type] = (stats[r.type] || 0) + 1;
        });
        return stats;
    }, [allRecs]);

    const hasData = state.products.length > 0;

    if (!hasData) {
        return (
            <div className="max-w-5xl">
                <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                    <Lightbulb className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">Veri Bulunamadı</h3>
                    <p className="text-slate-500">
                        AI önerileri için önce Veri Yönetimi'nden Excel dosyalarınızı yükleyin
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Lightbulb className="w-7 h-7 text-indigo-600" />
                        AI Önerileri
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {allRecommendations.length} ürün için {allRecs.length} aksiyon önerisi
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <AlertTriangle className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{summary.criticalCount}</span>
                    </div>
                    <p className="text-sm opacity-90 mt-2">ACİL Öneri</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <TrendingDown className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{summary.highCount}</span>
                    </div>
                    <p className="text-sm opacity-90 mt-2">ÖNEMLİ Öneri</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <Package className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{allRecommendations.length}</span>
                    </div>
                    <p className="text-sm opacity-90 mt-2">Etkilenen Ürün</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <Sparkles className="w-8 h-8 opacity-80" />
                        <span className="text-3xl font-bold">{Object.keys(typeStats).length}</span>
                    </div>
                    <p className="text-sm opacity-90 mt-2">Öneri Kategorisi</p>
                </div>
            </div>

            {/* Type Filter Chips */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Öneri Türü</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setTypeFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Tümü ({allRecs.length})
                    </button>
                    {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                        const count = typeStats[type] || 0;
                        if (count === 0) return null;
                        const Icon = config.icon;
                        return (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type as RecommendationType)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${typeFilter === type
                                        ? `${config.bgColor} ${config.color}`
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {config.label} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search & Urgency Filter */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Ürün ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['all', 'critical', 'high', 'medium', 'low'] as const).map(urgency => (
                        <button
                            key={urgency}
                            onClick={() => setUrgencyFilter(urgency)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${urgencyFilter === urgency
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            {urgency === 'all' ? 'Tümü' : URGENCY_CONFIG[urgency].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recommendations List */}
            <div className="space-y-3">
                {filteredRecs.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-8 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 mb-3" />
                        <h3 className="font-semibold text-slate-700">Bu filtrelere uygun öneri yok</h3>
                        <p className="text-sm text-slate-500 mt-1">Filtreleri değiştirmeyi deneyin</p>
                    </div>
                ) : (
                    filteredRecs.map(rec => (
                        <RecommendationCard
                            key={rec.id}
                            recommendation={rec}
                            onExpand={() => setSelectedRec(rec)}
                        />
                    ))
                )}
            </div>

            {/* Detail Modal */}
            {selectedRec && (
                <DetailModal
                    recommendation={selectedRec}
                    onClose={() => setSelectedRec(null)}
                />
            )}
        </div>
    );
};

export default AIRecommendationsView;
