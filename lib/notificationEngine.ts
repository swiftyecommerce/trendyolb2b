/**
 * Bildirim Motoru (Notification Engine)
 * 
 * Ürün zekâsı: Sadece veri göstermek yerine, anlamlı içgörüler üretir.
 * Her bildirim: priorityScore, impact metrikleri ve aksiyon yönlendirmesi içerir.
 */

import type {
    Notification,
    NotificationSeverity,
    NotificationCategory,
    ProductStats,
    ProductTrend,
    ProductTrendStatus,
    StockRecommendation,
    AppSettings
} from '../types';
import { AppTab } from '../types';
import { formatCurrency, formatNumber, formatPercent } from './excelParser';


// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

function generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function now(): string {
    return new Date().toISOString();
}

/**
 * Öncelik skoru hesaplama (0-100)
 * Faktörler: ciro etkisi, stok riski, trend sapması, ürün sayısı
 */
function calculatePriorityScore(params: {
    estimatedImpact?: number;      // Kayıp veya potansiyel ciro
    affectedCount?: number;         // Etkilenen ürün sayısı
    changePercent?: number;         // % değişim (negatif = kötü)
    stockRisk?: boolean;            // Stok riski var mı
    isSegmentA?: boolean;           // Segment A ürünü mü
}): number {
    let score = 0;

    // Ciro etkisi (0-40 puan)
    if (params.estimatedImpact) {
        if (params.estimatedImpact >= 50000) score += 40;
        else if (params.estimatedImpact >= 20000) score += 30;
        else if (params.estimatedImpact >= 10000) score += 20;
        else if (params.estimatedImpact >= 5000) score += 10;
        else score += 5;
    }

    // Etkilenen ürün sayısı (0-20 puan)
    if (params.affectedCount) {
        if (params.affectedCount >= 10) score += 20;
        else if (params.affectedCount >= 5) score += 15;
        else if (params.affectedCount >= 3) score += 10;
        else score += 5;
    }

    // Trend sapması (0-20 puan)
    if (params.changePercent !== undefined) {
        const absChange = Math.abs(params.changePercent);
        if (absChange >= 50) score += 20;
        else if (absChange >= 30) score += 15;
        else if (absChange >= 20) score += 10;
        else if (absChange >= 10) score += 5;
    }

    // Stok riski bonus (0-10 puan)
    if (params.stockRisk) score += 10;

    // Segment A bonus (0-10 puan)
    if (params.isSegmentA) score += 10;

    return Math.min(100, score);
}

// ============================================
// STOK BİLDİRİMLERİ
// ============================================

export function generateStockNotifications(
    recommendations: StockRecommendation[],
    products: ProductStats[]
): Notification[] {
    const notifications: Notification[] = [];

    // Kritik stoklar
    const criticalStock = recommendations.filter(r => r.urgency === 'critical');
    if (criticalStock.length > 0) {
        const totalImpact = criticalStock.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
        const topProducts = criticalStock.slice(0, 5);

        notifications.push({
            id: generateId(),
            severity: 'critical',
            category: 'stock',
            status: 'new',
            title: `${criticalStock.length} ürün kritik stok seviyesinde`,
            description: `5 gün içinde tükenecek ürünler var. Bu ürünler son dönemde ${formatCurrency(totalImpact)} ciro yapmıştı.`,
            metric: `Tahmini kayıp: ${formatCurrency(totalImpact * 0.3)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: totalImpact * 0.3,
                affectedCount: criticalStock.length,
                stockRisk: true
            }),
            impact: {
                estimatedLostRevenue: totalImpact * 0.3,
                affectedProductCount: criticalStock.length,
                affectedRevenue: totalImpact
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'stock-critical',
                relatedProducts: criticalStock.map(p => p.modelKodu)
            },
            relatedProducts: criticalStock.map(p => p.modelKodu),
            createdAt: now()
        });
    }

    // Satış ivmesi artan ama stok düşük ürünler
    const risingButLowStock = recommendations.filter(r => {
        const product = products.find(p => p.modelKodu === r.modelKodu);
        return r.urgency === 'warning' && product && product.segment === 'A';
    });

    if (risingButLowStock.length > 0) {
        const totalImpact = risingButLowStock.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);

        notifications.push({
            id: generateId(),
            severity: 'critical',
            category: 'stock',
            status: 'new',
            title: `${risingButLowStock.length} Segment A ürünü stok riski altında`,
            description: `En iyi performans gösteren ürünlerinizin stoğu azalıyor. Hızlı aksiyon gerekli.`,
            metric: `Risk altındaki ciro: ${formatCurrency(totalImpact)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: totalImpact,
                affectedCount: risingButLowStock.length,
                stockRisk: true,
                isSegmentA: true
            }),
            impact: {
                estimatedLostRevenue: totalImpact * 0.5,
                affectedProductCount: risingButLowStock.length,
                affectedRevenue: totalImpact
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'stock-warning',
                filters: { segment: 'A' },
                relatedProducts: risingButLowStock.map(p => p.modelKodu)
            },
            relatedProducts: risingButLowStock.map(p => p.modelKodu),
            createdAt: now()
        });
    }

    return notifications;
}

// ============================================
// SATIŞ BİLDİRİMLERİ
// ============================================

export function generateSalesNotifications(
    currentProducts: ProductStats[],
    previousProducts: ProductStats[],
    periodLabel: string = '30 gün'
): Notification[] {
    const notifications: Notification[] = [];

    // Satış düşüşleri tespit et
    const significantDrops: Array<{ product: ProductStats; previousRevenue: number; changePercent: number }> = [];

    for (const current of currentProducts) {
        const previous = previousProducts.find(p => p.modelKodu === current.modelKodu);
        if (previous && previous.totalRevenue > 1000) { // Min 1000₺ ciro yapan ürünler
            const changePercent = ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100;
            if (changePercent < -30) { // %30'dan fazla düşüş
                significantDrops.push({ product: current, previousRevenue: previous.totalRevenue, changePercent });
            }
        }
    }

    if (significantDrops.length > 0) {
        const sorted = significantDrops.sort((a, b) => a.changePercent - b.changePercent);
        const totalLostRevenue = sorted.reduce((sum, d) =>
            sum + (d.previousRevenue - d.product.totalRevenue), 0
        );

        notifications.push({
            id: generateId(),
            severity: sorted.length >= 5 ? 'critical' : 'high',
            category: 'sales',
            status: 'new',
            title: `${sorted.length} ürün önemli satış kaybı yaşıyor`,
            description: `Bu ürünler önceki döneme göre %30'dan fazla ciro kaybetti.`,
            metric: `Tahmini kayıp: ${formatCurrency(totalLostRevenue)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: totalLostRevenue,
                affectedCount: sorted.length,
                changePercent: sorted[0].changePercent
            }),
            impact: {
                estimatedLostRevenue: totalLostRevenue,
                affectedProductCount: sorted.length
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'cooling-products',
                relatedProducts: sorted.slice(0, 10).map(d => d.product.modelKodu)
            },
            relatedProducts: sorted.slice(0, 10).map(d => d.product.modelKodu),
            createdAt: now()
        });
    }

    // Satmayan ama eskiden satan ürünler
    const notSellingNow = currentProducts.filter(p => {
        const previous = previousProducts.find(pr => pr.modelKodu === p.modelKodu);
        return p.totalQuantity === 0 && previous && previous.totalQuantity >= 5;
    });

    if (notSellingNow.length > 0) {
        const lostRevenue = notSellingNow.reduce((sum, p) => {
            const prev = previousProducts.find(pr => pr.modelKodu === p.modelKodu);
            return sum + (prev?.totalRevenue || 0);
        }, 0);

        notifications.push({
            id: generateId(),
            severity: notSellingNow.length >= 5 ? 'critical' : 'high',
            category: 'sales',
            status: 'new',
            title: `${notSellingNow.length} ürün artık satmıyor`,
            description: `Bu ürünler ${periodLabel} önce satıyordu ama şu an hiç satış yok.`,
            metric: `Önceki dönem cirosu: ${formatCurrency(lostRevenue)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: lostRevenue,
                affectedCount: notSellingNow.length,
                changePercent: -100
            }),
            impact: {
                estimatedLostRevenue: lostRevenue,
                affectedProductCount: notSellingNow.length
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'dormant-products',
                relatedProducts: notSellingNow.slice(0, 10).map(p => p.modelKodu)
            },
            relatedProducts: notSellingNow.slice(0, 10).map(p => p.modelKodu),
            createdAt: now()
        });
    }

    return notifications;
}

// ============================================
// DÖNÜŞÜM BİLDİRİMLERİ
// ============================================

export function generateConversionNotifications(
    products: ProductStats[],
    settings: AppSettings
): Notification[] {
    const notifications: Notification[] = [];

    // Yüksek görüntülenme, düşük dönüşüm
    const highViewLowConversion = products.filter(p =>
        p.totalImpressions >= settings.minImpressionsForOpportunity &&
        p.conversionRate < 0.5
    ).sort((a, b) => b.totalImpressions - a.totalImpressions);

    if (highViewLowConversion.length > 0) {
        // Potansiyel ciro: Ortalama dönüşüm oranına ulaşsalar ne kazanırlar?
        const avgConversion = products.filter(p => p.totalImpressions > 100)
            .reduce((sum, p) => sum + p.conversionRate, 0) / products.length;

        const potentialRevenue = highViewLowConversion.reduce((sum, p) => {
            const potentialSales = (p.totalImpressions * avgConversion / 100) - p.totalQuantity;
            return sum + (potentialSales * p.avgUnitPrice);
        }, 0);

        notifications.push({
            id: generateId(),
            severity: highViewLowConversion.length >= 10 ? 'high' : 'info',
            category: 'conversion',
            status: 'new',
            title: `${highViewLowConversion.length} üründe dönüşüm fırsatı`,
            description: `Bu ürünler görüntüleniyor ama satın alınmıyor. Görsel veya fiyat optimizasyonu önerilir.`,
            metric: `Potansiyel ciro: ${formatCurrency(potentialRevenue)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: potentialRevenue,
                affectedCount: highViewLowConversion.length
            }),
            impact: {
                potentialRevenue,
                affectedProductCount: highViewLowConversion.length
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'conversion-drop',
                relatedProducts: highViewLowConversion.slice(0, 10).map(p => p.modelKodu)
            },
            relatedProducts: highViewLowConversion.slice(0, 10).map(p => p.modelKodu),
            createdAt: now()
        });
    }

    // Sepete eklenip satın alınmayan ürünler
    const highCartLowSale = products.filter(p =>
        p.totalAddToCart >= 10 &&
        p.cartToSaleRate < 15
    ).sort((a, b) => b.totalAddToCart - a.totalAddToCart);

    if (highCartLowSale.length > 0) {
        const lostSales = highCartLowSale.reduce((sum, p) => {
            const expectedSales = p.totalAddToCart * 0.25; // Normal oran %25
            const lostUnits = expectedSales - p.totalQuantity;
            return sum + (lostUnits * p.avgUnitPrice);
        }, 0);

        notifications.push({
            id: generateId(),
            severity: 'high',
            category: 'conversion',
            status: 'new',
            title: `${highCartLowSale.length} üründe sepet terk problemi`,
            description: `Bu ürünler sepete ekleniyor ama satın alınmıyor. Fiyat, kargo veya stok kontrolü önerilir.`,
            metric: `Kaçırılan satış: ${formatCurrency(lostSales)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: lostSales,
                affectedCount: highCartLowSale.length,
                changePercent: -60
            }),
            impact: {
                estimatedLostRevenue: lostSales,
                affectedProductCount: highCartLowSale.length
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'cart-abandon',
                relatedProducts: highCartLowSale.slice(0, 10).map(p => p.modelKodu)
            },
            relatedProducts: highCartLowSale.slice(0, 10).map(p => p.modelKodu),
            createdAt: now()
        });
    }

    return notifications;
}

// ============================================
// TREND BİLDİRİMLERİ
// ============================================

export function generateTrendNotifications(
    trends: ProductTrend[]
): Notification[] {
    const notifications: Notification[] = [];

    // Soğuyan ürünler
    const coolingProducts = trends.filter(t => t.status === 'cooling');
    if (coolingProducts.length > 0) {
        const totalImpact = coolingProducts.reduce((sum, t) =>
            sum + (t.estimatedImpact || 0), 0
        );

        notifications.push({
            id: generateId(),
            severity: coolingProducts.length >= 5 ? 'high' : 'info',
            category: 'trend',
            status: 'new',
            title: `${coolingProducts.length} ürün ilgisini kaybediyor`,
            description: `Bu ürünler eskiden iyi satıyordu ama artık performansı düşüyor. Görsel, fiyat veya kampanya kontrolü önerilir.`,
            metric: `Etkilenen ciro: ${formatCurrency(totalImpact)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: totalImpact,
                affectedCount: coolingProducts.length,
                changePercent: -30
            }),
            impact: {
                estimatedLostRevenue: totalImpact,
                affectedProductCount: coolingProducts.length
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'cooling-products',
                relatedProducts: coolingProducts.slice(0, 10).map(t => t.modelKodu)
            },
            relatedProducts: coolingProducts.slice(0, 10).map(t => t.modelKodu),
            createdAt: now()
        });
    }

    // Tamamen duran ürünler (dormant)
    const dormantProducts = trends.filter(t => t.status === 'dormant');
    if (dormantProducts.length > 0) {
        const totalPreviousRevenue = dormantProducts.reduce((sum, t) =>
            sum + (t.longTermRevenue || 0), 0
        );

        notifications.push({
            id: generateId(),
            severity: 'high',
            category: 'trend',
            status: 'new',
            title: `${dormantProducts.length} ürün 90+ gündür satmıyor`,
            description: `Bu ürünler geçmişte satış yapıyordu ama artık tamamen durdu. Katalog veya stok değerlendirmesi önerilir.`,
            metric: `Eski dönem cirosu: ${formatCurrency(totalPreviousRevenue)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: totalPreviousRevenue,
                affectedCount: dormantProducts.length,
                changePercent: -100
            }),
            impact: {
                estimatedLostRevenue: totalPreviousRevenue,
                affectedProductCount: dormantProducts.length
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'dormant-products',
                relatedProducts: dormantProducts.slice(0, 10).map(t => t.modelKodu)
            },
            relatedProducts: dormantProducts.slice(0, 10).map(t => t.modelKodu),
            createdAt: now()
        });
    }

    // Yükselen ürünler (pozitif bildirim)
    const risingProducts = trends.filter(t => t.status === 'rising');
    if (risingProducts.length > 0) {
        const totalGrowth = risingProducts.reduce((sum, t) =>
            sum + (t.shortTermRevenue - t.longTermRevenue / 4), 0 // Son 7g vs aylık ortalama
        );

        notifications.push({
            id: generateId(),
            severity: 'info',
            category: 'trend',
            status: 'new',
            title: `${risingProducts.length} ürün ivme kazanıyor`,
            description: `Bu ürünler son dönemde beklenenden iyi performans gösteriyor. Stok ve görünürlük artırma fırsatı.`,
            metric: `Ekstra ciro: ${formatCurrency(totalGrowth)}`,
            priorityScore: calculatePriorityScore({
                estimatedImpact: totalGrowth,
                affectedCount: risingProducts.length,
                changePercent: 30
            }),
            impact: {
                potentialRevenue: totalGrowth * 2,
                affectedProductCount: risingProducts.length
            },
            actionRoute: {
                tab: AppTab.ANALYSIS,
                analysisType: 'rising-products',
                relatedProducts: risingProducts.slice(0, 10).map(t => t.modelKodu)
            },
            relatedProducts: risingProducts.slice(0, 10).map(t => t.modelKodu),
            createdAt: now()
        });
    }

    return notifications;
}

// ============================================
// VERİ BİLDİRİMLERİ
// ============================================

export function generateDataNotifications(
    currentYear: number,
    currentMonth: number,
    loadedMonths: Array<{ year: number; month: number }>
): Notification[] {
    const notifications: Notification[] = [];

    const monthNames = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    // Bulunduğumuz ay için veri var mı?
    const hasCurrentMonth = loadedMonths.some(
        m => m.year === currentYear && m.month === currentMonth
    );

    if (!hasCurrentMonth) {
        notifications.push({
            id: generateId(),
            severity: 'info',
            category: 'data',
            status: 'new',
            title: `${monthNames[currentMonth - 1]} ayı verisi eksik`,
            description: `Geçen yıl ile sağlıklı kıyas için bu ayın verisini yükleyin.`,
            priorityScore: 30,
            actionRoute: {
                tab: AppTab.DATA_MANAGEMENT,
                analysisType: 'data-missing',
                relatedProducts: []
            },
            createdAt: now()
        });
    }

    // Geçen yılın aynı ayı için veri var mı?
    const hasPreviousYearSameMonth = loadedMonths.some(
        m => m.year === currentYear - 1 && m.month === currentMonth
    );

    if (!hasPreviousYearSameMonth && hasCurrentMonth) {
        notifications.push({
            id: generateId(),
            severity: 'info',
            category: 'data',
            status: 'new',
            title: `Geçen yılın ${monthNames[currentMonth - 1]} verisi eksik`,
            description: `Yıl bazlı karşılaştırma için geçen yılın aynı dönem verisini yükleyin.`,
            priorityScore: 25,
            actionRoute: {
                tab: AppTab.DATA_MANAGEMENT,
                analysisType: 'data-missing',
                relatedProducts: []
            },
            createdAt: now()
        });
    }

    return notifications;
}

// ============================================
// ANA BİLDİRİM ÜRETİCİ
// ============================================

export function generateAllNotifications(params: {
    products: ProductStats[];
    previousProducts?: ProductStats[];
    stockRecommendations: StockRecommendation[];
    trends?: ProductTrend[];
    settings: AppSettings;
    loadedMonths?: Array<{ year: number; month: number }>;
}): Notification[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let allNotifications: Notification[] = [];

    // Stok bildirimleri
    allNotifications = allNotifications.concat(
        generateStockNotifications(params.stockRecommendations, params.products)
    );

    // Satış bildirimleri (eğer önceki dönem verisi varsa)
    if (params.previousProducts && params.previousProducts.length > 0) {
        allNotifications = allNotifications.concat(
            generateSalesNotifications(params.products, params.previousProducts)
        );
    }

    // Dönüşüm bildirimleri
    allNotifications = allNotifications.concat(
        generateConversionNotifications(params.products, params.settings)
    );

    // Trend bildirimleri
    if (params.trends && params.trends.length > 0) {
        allNotifications = allNotifications.concat(
            generateTrendNotifications(params.trends)
        );
    }

    // Veri bildirimleri
    if (params.loadedMonths) {
        allNotifications = allNotifications.concat(
            generateDataNotifications(currentYear, currentMonth, params.loadedMonths)
        );
    }

    // Öncelik skoruna göre sırala
    allNotifications.sort((a, b) => b.priorityScore - a.priorityScore);

    return allNotifications;
}

// ============================================
// TREND HESAPLAMA
// ============================================

export function calculateProductTrends(
    shortTermProducts: ProductStats[],  // Son 7 gün
    longTermProducts: ProductStats[],   // Son 30 gün
    previousYearProducts?: ProductStats[] // Geçen yıl
): ProductTrend[] {
    const trends: ProductTrend[] = [];

    // Tüm ürünleri birleştir
    const allModelKodus = new Set<string>();
    shortTermProducts.forEach(p => allModelKodus.add(p.modelKodu));
    longTermProducts.forEach(p => allModelKodus.add(p.modelKodu));

    for (const modelKodu of allModelKodus) {
        const shortTerm = shortTermProducts.find(p => p.modelKodu === modelKodu);
        const longTerm = longTermProducts.find(p => p.modelKodu === modelKodu);
        const prevYear = previousYearProducts?.find(p => p.modelKodu === modelKodu);

        if (!longTerm) continue;

        const shortTermRevenue = shortTerm?.totalRevenue || 0;
        const longTermRevenue = longTerm.totalRevenue;

        // Haftalık ortalama hesapla (30 gün / 4 hafta)
        const weeklyAverage = longTermRevenue / 4;

        // Değişim yüzdesi
        let shortTermChange = 0;
        if (weeklyAverage > 0) {
            shortTermChange = ((shortTermRevenue - weeklyAverage) / weeklyAverage) * 100;
        }

        // YoY değişim
        let yoyChange: number | undefined;
        if (prevYear && prevYear.totalRevenue > 0) {
            yoyChange = ((longTermRevenue - prevYear.totalRevenue) / prevYear.totalRevenue) * 100;
        }

        // Trend durumu belirle
        let status: ProductTrendStatus;

        if (!shortTerm || shortTermRevenue === 0) {
            if (longTermRevenue > 1000) {
                status = 'dormant';
            } else {
                status = 'stable';
            }
        } else if (shortTermChange > 30) {
            status = 'rising';
        } else if (shortTermChange < -30) {
            status = 'cooling';
        } else {
            status = 'stable';
        }

        // Sadece yeni görülen ürünler
        if (!longTerm && shortTerm && shortTermRevenue > 0) {
            status = 'new';
        }

        // Tahmini etki
        let estimatedImpact = 0;
        if (status === 'cooling' || status === 'dormant') {
            estimatedImpact = longTermRevenue - shortTermRevenue;
        } else if (status === 'rising') {
            estimatedImpact = shortTermRevenue - weeklyAverage;
        }

        trends.push({
            modelKodu,
            productName: longTerm?.productName || shortTerm?.productName || '',
            imageUrl: longTerm?.imageUrl || shortTerm?.imageUrl,
            category: longTerm?.category || shortTerm?.category,

            status,

            shortTermRevenue,
            longTermRevenue,
            shortTermChange,

            currentYearRevenue: longTermRevenue,
            previousYearRevenue: prevYear?.totalRevenue,
            yoyChange,

            estimatedImpact: Math.abs(estimatedImpact),

            previousSegment: prevYear?.segment,
            currentSegment: longTerm?.segment
        });
    }

    return trends;
}
