/**
 * AI Öneri Motoru (Recommendation Engine)
 * 
 * Her ürün için akıllı aksiyon önerileri üretir.
 * Öneriler: Stok, Fiyat, Görsel, Kampanya odaklı
 */

import type { ProductStats, StockRecommendation, ProductTrend } from '../types';
import { formatCurrency, formatNumber, formatPercent } from './excelParser';

// ============================================
// RECOMMENDATION TYPES
// ============================================

export type RecommendationType =
    | 'restock'           // Stok yenile
    | 'price-review'      // Fiyat gözden geçir
    | 'visual-update'     // Görsel güncelle
    | 'promotion'         // Kampanya öner
    | 'boost-visibility'  // Görünürlük artır
    | 'archive'           // Arşivle
    | 'bundle'            // Paket oluştur
    | 'cross-sell';       // Çapraz satış

export type RecommendationUrgency = 'critical' | 'high' | 'medium' | 'low';

export interface Recommendation {
    id: string;
    type: RecommendationType;
    urgency: RecommendationUrgency;

    title: string;
    description: string;
    reason: string;           // Neden bu öneri?

    // Tahmini etki
    estimatedImpact?: string;  // "₺5.000 ek ciro potansiyeli"
    impactScore: number;       // 0-100

    // Aksiyon detayları
    actionSteps: string[];

    // İlişkili ürün
    productId: string;
    productName: string;
}

export interface ProductRecommendations {
    modelKodu: string;
    productName: string;
    recommendations: Recommendation[];
    overallScore: number;      // 0-100, ürün sağlık skoru
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getUrgencyFromScore(score: number): RecommendationUrgency {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
}

// ============================================
// STOCK RECOMMENDATIONS
// ============================================

function generateStockRecommendation(
    product: ProductStats,
    stockRec?: StockRecommendation
): Recommendation | null {
    if (!stockRec || stockRec.urgency === 'ok' || stockRec.urgency === 'no-data') {
        return null;
    }

    const isCritical = stockRec.urgency === 'critical';
    const daysLeft = stockRec.daysUntilEmpty || 0;
    const dailyRevenue = stockRec.dailySales * product.avgUnitPrice;
    const potentialLoss = dailyRevenue * 7; // 1 haftalık potansiyel kayıp

    return {
        id: generateId(),
        type: 'restock',
        urgency: isCritical ? 'critical' : 'high',
        title: isCritical ? 'ACİL STOK YENİLE' : 'Stok Sipariş Et',
        description: `Stok ${daysLeft} gün içinde bitecek. Günlük ${formatNumber(stockRec.dailySales)} adet satış var.`,
        reason: `Bu ürün son dönemde ${formatCurrency(product.totalRevenue)} ciro yaptı ve segment ${product.segment} ürünü.`,
        estimatedImpact: `Stoksuz kalırsa ~${formatCurrency(potentialLoss)} kayıp`,
        impactScore: isCritical ? 95 : 75,
        actionSteps: [
            `${formatNumber(stockRec.recommendedOrder)} adet sipariş ver`,
            'Tedarikçi ile teslim süresi konfirme et',
            isCritical ? 'Acil kargo seçeneği değerlendir' : 'Normal sipariş süreci uygula'
        ],
        productId: product.modelKodu,
        productName: product.productName
    };
}

// ============================================
// CONVERSION RECOMMENDATIONS
// ============================================

function generateConversionRecommendation(product: ProductStats): Recommendation | null {
    // Yüksek görüntülenme, düşük dönüşüm
    if (product.totalImpressions >= 500 && product.conversionRate < 0.5) {
        const potentialSales = (product.totalImpressions * 1.5 / 100) - product.totalQuantity;
        const potentialRevenue = potentialSales * product.avgUnitPrice;

        // Görsel mi fiyat mı?
        const isViewToCartLow = product.viewToCartRate < 2;
        const isCartToSaleLow = product.cartToSaleRate < 20;

        if (isViewToCartLow) {
            return {
                id: generateId(),
                type: 'visual-update',
                urgency: 'high',
                title: 'Ürün Görseli Güncelle',
                description: `${formatNumber(product.totalImpressions)} görüntülenme var ama sepete ekleme oranı çok düşük (${formatPercent(product.viewToCartRate)}).`,
                reason: 'Müşteriler ürünü görüyor ama ilgi göstermiyor. Görsel veya başlık düzenlemesi gerekebilir.',
                estimatedImpact: `${formatCurrency(potentialRevenue)} ek ciro potansiyeli`,
                impactScore: 70,
                actionSteps: [
                    'Ana görseli profesyonel çekim ile güncelle',
                    'Ürün başlığını arama trendlerine göre optimize et',
                    'Açıklama metnini zenginleştir',
                    'Rakip görselleri analiz et'
                ],
                productId: product.modelKodu,
                productName: product.productName
            };
        }

        if (isCartToSaleLow) {
            return {
                id: generateId(),
                type: 'price-review',
                urgency: 'high',
                title: 'Fiyat Stratejisini Gözden Geçir',
                description: `Sepete ekleniyor (${formatNumber(product.totalAddToCart)} kez) ama satın alınmıyor (${formatPercent(product.cartToSaleRate)} dönüşüm).`,
                reason: 'Müşteriler ilgileniyor ama son adımda vazgeçiyor. Fiyat veya kargo maliyeti sorunu olabilir.',
                estimatedImpact: `${formatCurrency(potentialRevenue)} ek ciro potansiyeli`,
                impactScore: 75,
                actionSteps: [
                    'Rakip fiyatlarını kontrol et',
                    'Kargo ücretsiz kampanya değerlendir',
                    '%5-10 indirim testi yap',
                    'Bundle/paket fırsatı oluştur'
                ],
                productId: product.modelKodu,
                productName: product.productName
            };
        }
    }

    return null;
}

// ============================================
// TREND RECOMMENDATIONS
// ============================================

function generateTrendRecommendation(
    product: ProductStats,
    trend?: ProductTrend
): Recommendation | null {
    if (!trend) return null;

    // Soğuyan ürün
    if (trend.status === 'cooling') {
        return {
            id: generateId(),
            type: 'promotion',
            urgency: 'medium',
            title: 'Kampanya ile Canlandır',
            description: `Satışlar ${formatPercent(Math.abs(trend.shortTermChange))} düştü. Ürün ilgisini kaybediyor.`,
            reason: `Son 7 günde ${formatCurrency(trend.shortTermRevenue)} ciro, 30 günlük ortalama ${formatCurrency(trend.longTermRevenue / 4)} idi.`,
            estimatedImpact: `${formatCurrency(trend.estimatedImpact || 0)} potansiyel kurtarma`,
            impactScore: 60,
            actionSteps: [
                'Flash sale kampanyası düzenle',
                'Sosyal medya paylaşımı yap',
                'İndirim kuponu oluştur',
                'Bundle teklifine ekle'
            ],
            productId: product.modelKodu,
            productName: product.productName
        };
    }

    // Yükselen ürün - stok kontrol
    if (trend.status === 'rising') {
        return {
            id: generateId(),
            type: 'boost-visibility',
            urgency: 'low',
            title: 'Görünürlüğü Artır',
            description: `Satışlar ${formatPercent(trend.shortTermChange)} arttı! Bu fırsatı değerlendir.`,
            reason: `Ürün trend, stok ve görünürlük artırılarak daha fazla satış yapılabilir.`,
            estimatedImpact: `${formatCurrency((trend.estimatedImpact || 0) * 2)} ek potansiyel`,
            impactScore: 50,
            actionSteps: [
                'Stok seviyesini kontrol et',
                'Reklam bütçesini artır',
                'Anasayfa öne çıkarmaya başvur',
                'Sosyal medyada tanıt'
            ],
            productId: product.modelKodu,
            productName: product.productName
        };
    }

    // Dormant ürün
    if (trend.status === 'dormant') {
        return {
            id: generateId(),
            type: 'archive',
            urgency: 'low',
            title: 'Arşivleme Değerlendir',
            description: 'Bu ürün 90+ gündür satış yapmıyor.',
            reason: `Geçmişte ${formatCurrency(trend.longTermRevenue)} ciro yapmıştı ama artık talep görmüyor.`,
            impactScore: 30,
            actionSteps: [
                'Stok maliyetini hesapla',
                'Tasfiye indirimi uygula',
                'Başka pazaryerine yönlendir',
                'Veya katalogdan kaldır'
            ],
            productId: product.modelKodu,
            productName: product.productName
        };
    }

    return null;
}

// ============================================
// SEGMENT BASED RECOMMENDATIONS
// ============================================

function generateSegmentRecommendation(product: ProductStats): Recommendation | null {
    // Segment A ürününe özel dikkat
    if (product.segment === 'A' && product.totalImpressions < 500) {
        return {
            id: generateId(),
            type: 'boost-visibility',
            urgency: 'high',
            title: 'Star Ürün Görünürlüğü Düşük',
            description: `Segment A ürünü ama sadece ${formatNumber(product.totalImpressions)} görüntülenme var.`,
            reason: 'En iyi satan ürün kategorisinde ama yeterli traffic alamıyor.',
            impactScore: 65,
            actionSteps: [
                'Reklam kampanyasına ekle',
                'SEO optimizasyonu yap',
                'Ürün başlığını güncelle',
                'Anasayfa yerleşimi için başvur'
            ],
            productId: product.modelKodu,
            productName: product.productName
        };
    }

    return null;
}

// ============================================
// MAIN GENERATOR
// ============================================

export function generateProductRecommendations(
    product: ProductStats,
    stockRec?: StockRecommendation,
    trend?: ProductTrend
): ProductRecommendations {
    const recommendations: Recommendation[] = [];

    // Stok önerisi
    const stockRecommendation = generateStockRecommendation(product, stockRec);
    if (stockRecommendation) recommendations.push(stockRecommendation);

    // Dönüşüm önerisi
    const conversionRecommendation = generateConversionRecommendation(product);
    if (conversionRecommendation) recommendations.push(conversionRecommendation);

    // Trend önerisi
    const trendRecommendation = generateTrendRecommendation(product, trend);
    if (trendRecommendation) recommendations.push(trendRecommendation);

    // Segment önerisi
    const segmentRecommendation = generateSegmentRecommendation(product);
    if (segmentRecommendation) recommendations.push(segmentRecommendation);

    // Sırala (impact score'a göre)
    recommendations.sort((a, b) => b.impactScore - a.impactScore);

    // Genel sağlık skoru
    const hasProblems = recommendations.filter(r => r.urgency === 'critical' || r.urgency === 'high').length;
    const overallScore = Math.max(0, 100 - (hasProblems * 20) - (recommendations.length * 5));

    return {
        modelKodu: product.modelKodu,
        productName: product.productName,
        recommendations,
        overallScore
    };
}

export function generateAllRecommendations(
    products: ProductStats[],
    stockRecs: StockRecommendation[],
    trends: ProductTrend[]
): ProductRecommendations[] {
    return products.map(product => {
        const stockRec = stockRecs.find(s => s.modelKodu === product.modelKodu);
        const trend = trends.find(t => t.modelKodu === product.modelKodu);
        return generateProductRecommendations(product, stockRec, trend);
    }).filter(p => p.recommendations.length > 0)
        .sort((a, b) => {
            // Önce critical olanlar
            const aMax = Math.max(...a.recommendations.map(r => r.impactScore));
            const bMax = Math.max(...b.recommendations.map(r => r.impactScore));
            return bMax - aMax;
        });
}

// ============================================
// TOP RECOMMENDATIONS SUMMARY
// ============================================

export interface TopRecommendationsSummary {
    totalProducts: number;
    criticalCount: number;
    highCount: number;
    topActions: Array<{
        type: RecommendationType;
        count: number;
        totalImpact: number;
    }>;
}

export function getTopRecommendationsSummary(
    allRecs: ProductRecommendations[]
): TopRecommendationsSummary {
    const allRecommendations = allRecs.flatMap(p => p.recommendations);

    const criticalCount = allRecommendations.filter(r => r.urgency === 'critical').length;
    const highCount = allRecommendations.filter(r => r.urgency === 'high').length;

    // Group by type
    const byType = new Map<RecommendationType, { count: number; totalImpact: number }>();
    allRecommendations.forEach(r => {
        const existing = byType.get(r.type) || { count: 0, totalImpact: 0 };
        byType.set(r.type, {
            count: existing.count + 1,
            totalImpact: existing.totalImpact + r.impactScore
        });
    });

    const topActions = Array.from(byType.entries())
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        totalProducts: allRecs.length,
        criticalCount,
        highCount,
        topActions
    };
}
