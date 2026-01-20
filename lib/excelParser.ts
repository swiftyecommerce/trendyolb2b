import * as XLSX from 'xlsx';
import type {
    RawSaleRow,
    ProductStats,
    StockRecommendation,
    DayStats,
    AnalyticsState,
    ReportPeriod,
    UploadedReport,
    ExcelDataStore,
    AppSettings
} from '../types';

// ============================================
// COLUMN MAPPINGS
// ============================================

const PRODUCT_COLUMNS: Record<string, keyof RawSaleRow> = {
    'Barkod': 'sku',
    'Model Kodu': 'modelKodu',
    'Marka': 'brand',
    'Kategori İsmi': 'category',
    'Ürün Adı': 'productName',
    'Ürün Açıklaması': 'productName',
    'Satış Fiyatı (KDV)': 'unitPrice',
    'Satış Fiyatı (KDV': 'unitPrice',
    'Ürün Stok Adedi': 'stock',
    'Görsel 1': 'imageUrl',
    'Trendyol.com Linki': 'productUrl',
    'BuyBox Fiyatı': 'buyboxPrice',
};

const SALES_COLUMNS: Record<string, keyof RawSaleRow> = {
    'Ürün Görseli': 'imageUrl',
    'Ürün Kategorisi': 'category',
    'Marka': 'brand',
    'Model Kodu': 'modelKodu',
    'Ürün Adı': 'productName',
    'Toplam Görüntülenme Sayısı': 'impressions',
    'Brüt Favorileme Sayısı': 'favorites',
    'Aktif Favori Sayısı': 'favorites',
    'Satıcı Görüntülenme Sayısı': 'sessions',
    'Sepete Eklenme Sayısı': 'addToCart',
    'Brüt Sipariş Adedi': 'quantity',
    'Satışa Dönüş Oranı': 'conversionRate' as keyof RawSaleRow,
    'Brüt Satış Adedi': 'quantity',
    'Brüt Ciro': 'revenue',
};

// ============================================
// PARSING UTILITIES
// ============================================

function parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Handle Turkish number format (1.234,56 -> 1234.56)
        const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(cleaned) || 0;
    }
    return 0;
}

function findColumnIndex(headers: string[], targetKeys: string[]): number {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i]?.trim() || '';
        for (const key of targetKeys) {
            if (header === key || header.startsWith(key) || key.startsWith(header)) {
                return i;
            }
        }
    }
    return -1;
}

function mapRowToRawSale(
    row: unknown[],
    headers: string[],
    columnMappings: Record<string, keyof RawSaleRow>,
    defaultDate: string
): RawSaleRow | null {
    const result: Partial<RawSaleRow> = { date: defaultDate };

    headers.forEach((header, idx) => {
        const trimmed = header?.trim() || '';
        let fieldName: keyof RawSaleRow | undefined;

        // Try exact match
        if (columnMappings[trimmed]) {
            fieldName = columnMappings[trimmed];
        } else {
            // Try partial match
            for (const [key, value] of Object.entries(columnMappings)) {
                if (trimmed.startsWith(key) || key.startsWith(trimmed)) {
                    fieldName = value;
                    break;
                }
            }
        }

        if (fieldName && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
            const numericFields = ['unitPrice', 'quantity', 'revenue', 'cost', 'impressions',
                'addToCart', 'sessions', 'returns', 'favorites', 'stock', 'buyboxPrice'];

            if (numericFields.includes(fieldName)) {
                (result as Record<string, unknown>)[fieldName] = parseNumber(row[idx]);
            } else {
                (result as Record<string, unknown>)[fieldName] = String(row[idx]);
            }
        }
    });

    // Require modelKodu
    if (!result.modelKodu) return null;

    // Set defaults
    result.productName = result.productName || result.modelKodu;
    result.quantity = result.quantity || 0;
    result.revenue = result.revenue || (result.quantity * (result.unitPrice || 0));
    result.unitPrice = result.unitPrice || (result.quantity > 0 ? result.revenue / result.quantity : 0);

    return result as RawSaleRow;
}

// ============================================
// EXCEL PARSING FUNCTIONS
// ============================================

export function parseProductExcel(file: ArrayBuffer): RawSaleRow[] {
    const workbook = XLSX.read(file, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

    if (jsonData.length < 2) return [];

    const headers = (jsonData[0] as string[]).map(h => String(h || ''));
    const today = new Date().toISOString().split('T')[0];
    const rows: RawSaleRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.length === 0) continue;

        const mapped = mapRowToRawSale(row, headers, PRODUCT_COLUMNS, today);
        if (mapped) rows.push(mapped);
    }

    return rows;
}

export function parseSalesReportExcel(file: ArrayBuffer, period: ReportPeriod): RawSaleRow[] {
    const workbook = XLSX.read(file, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

    if (jsonData.length < 2) return [];

    const headers = (jsonData[0] as string[]).map(h => String(h || ''));
    const today = new Date().toISOString().split('T')[0];
    const rows: RawSaleRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.length === 0) continue;

        const mapped = mapRowToRawSale(row, headers, SALES_COLUMNS, today);
        if (mapped) rows.push(mapped);
    }

    return rows;
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

const STORAGE_KEY = 'vizyonexcel_data';
const SETTINGS_KEY = 'vizyonexcel_settings';

export function getDefaultSettings(): AppSettings {
    return {
        targetStockDays: 30,
        minImpressionsForOpportunity: 100,
        currency: 'TRY',
        lowStockThreshold: 10
    };
}

export function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...getDefaultSettings(), ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return getDefaultSettings();
}

export function saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadStoredData(): ExcelDataStore {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load stored data:', e);
    }
    return { reports: {} };
}

export function saveReport(period: ReportPeriod, data: RawSaleRow[]): void {
    const store = loadStoredData();

    // OVERWRITE existing report of same period
    store.reports[period] = {
        period,
        uploadDate: new Date().toISOString(),
        rowCount: data.length,
        data
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveProductList(data: RawSaleRow[]): void {
    const store = loadStoredData();
    store.productList = {
        uploadDate: new Date().toISOString(),
        products: data
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================

export function aggregateByProduct(
    rows: RawSaleRow[],
    productList?: RawSaleRow[]
): Record<string, ProductStats> {
    const byProduct: Record<string, ProductStats> = {};

    // First, process product list for stock info
    const stockInfo: Record<string, { stock: number; buyboxPrice: number; imageUrl?: string; productUrl?: string }> = {};
    if (productList) {
        for (const p of productList) {
            stockInfo[p.modelKodu] = {
                stock: p.stock || 0,
                buyboxPrice: p.buyboxPrice || 0,
                imageUrl: p.imageUrl,
                productUrl: p.productUrl
            };
        }
    }

    // Process sales rows
    for (const row of rows) {
        const key = row.modelKodu;

        if (!byProduct[key]) {
            byProduct[key] = {
                modelKodu: key,
                productName: row.productName,
                category: row.category,
                brand: row.brand,
                imageUrl: row.imageUrl || stockInfo[key]?.imageUrl,
                productUrl: row.productUrl || stockInfo[key]?.productUrl,

                totalRevenue: 0,
                totalQuantity: 0,
                avgUnitPrice: 0,
                minPrice: Infinity,
                maxPrice: 0,

                totalImpressions: 0,
                totalAddToCart: 0,
                totalFavorites: 0,

                conversionRate: 0,
                viewToCartRate: 0,
                cartToSaleRate: 0,

                currentStock: stockInfo[key]?.stock ?? null,
                buyboxPrice: stockInfo[key]?.buyboxPrice ?? null,

                segment: 'C'
            };
        }

        const stats = byProduct[key];
        stats.totalRevenue += row.revenue || 0;
        stats.totalQuantity += row.quantity || 0;
        stats.totalImpressions += row.impressions || 0;
        stats.totalAddToCart += row.addToCart || 0;
        stats.totalFavorites += row.favorites || 0;

        if (row.unitPrice > 0) {
            stats.minPrice = Math.min(stats.minPrice, row.unitPrice);
            stats.maxPrice = Math.max(stats.maxPrice, row.unitPrice);
        }

        // Update product info if better data available
        if (row.imageUrl && !stats.imageUrl) stats.imageUrl = row.imageUrl;
        if (row.category && !stats.category) stats.category = row.category;
        if (row.brand && !stats.brand) stats.brand = row.brand;
        if (row.stock !== undefined && stats.currentStock === null) stats.currentStock = row.stock;
        if (row.buyboxPrice && stats.buyboxPrice === null) stats.buyboxPrice = row.buyboxPrice;
    }

    // Calculate derived metrics
    for (const stats of Object.values(byProduct)) {
        if (stats.minPrice === Infinity) stats.minPrice = 0;
        stats.avgUnitPrice = stats.totalQuantity > 0 ? stats.totalRevenue / stats.totalQuantity : 0;
        stats.conversionRate = stats.totalImpressions > 0 ? (stats.totalQuantity / stats.totalImpressions) * 100 : 0;
        stats.viewToCartRate = stats.totalImpressions > 0 ? (stats.totalAddToCart / stats.totalImpressions) * 100 : 0;
        stats.cartToSaleRate = stats.totalAddToCart > 0 ? (stats.totalQuantity / stats.totalAddToCart) * 100 : 0;
    }

    // Calculate ABC segments based on revenue
    const sorted = Object.values(byProduct).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const totalRevenue = sorted.reduce((sum, s) => sum + s.totalRevenue, 0);
    let cumulative = 0;

    for (const stats of sorted) {
        cumulative += stats.totalRevenue;
        const percent = (cumulative / totalRevenue) * 100;

        if (percent <= 80) {
            stats.segment = 'A';
        } else if (percent <= 95) {
            stats.segment = 'B';
        } else {
            stats.segment = 'C';
        }
    }

    return byProduct;
}

export function aggregateByDate(rows: RawSaleRow[]): Record<string, DayStats> {
    const byDate: Record<string, DayStats> = {};

    for (const row of rows) {
        const date = row.date;
        if (!byDate[date]) {
            byDate[date] = {
                date,
                totalRevenue: 0,
                totalQuantity: 0,
                totalImpressions: 0,
                totalAddToCart: 0,
                orderCount: 0,
                aov: 0
            };
        }

        const stats = byDate[date];
        stats.totalRevenue += row.revenue || 0;
        stats.totalQuantity += row.quantity || 0;
        stats.totalImpressions += row.impressions || 0;
        stats.totalAddToCart += row.addToCart || 0;
        stats.orderCount++;
    }

    // Calculate AOV
    for (const stats of Object.values(byDate)) {
        stats.aov = stats.orderCount > 0 ? stats.totalRevenue / stats.orderCount : 0;
    }

    return byDate;
}

// ============================================
// STOCK RECOMMENDATIONS
// ============================================

export function calculateStockRecommendations(
    products: ProductStats[],
    days: number,
    settings: AppSettings
): StockRecommendation[] {
    const recommendations: StockRecommendation[] = [];

    for (const product of products) {
        const dailySales = days > 0 ? product.totalQuantity / days : 0;

        let daysUntilEmpty: number | null = null;
        let urgency: StockRecommendation['urgency'] = 'no-data';
        let recommendedOrder = 0;

        if (product.currentStock !== null && product.currentStock >= 0) {
            if (dailySales > 0) {
                daysUntilEmpty = product.currentStock / dailySales;

                if (daysUntilEmpty <= 5) {
                    urgency = 'critical';
                } else if (daysUntilEmpty <= settings.lowStockThreshold) {
                    urgency = 'warning';
                } else {
                    urgency = 'ok';
                }

                const needed = settings.targetStockDays * dailySales - product.currentStock;
                recommendedOrder = Math.max(0, Math.ceil(needed));
            } else {
                urgency = product.currentStock < settings.lowStockThreshold ? 'warning' : 'ok';
                daysUntilEmpty = dailySales === 0 ? Infinity : null;
            }
        } else {
            // No stock data
            if (dailySales > 0) {
                urgency = 'warning';
                recommendedOrder = Math.ceil(settings.targetStockDays * dailySales);
            }
        }

        recommendations.push({
            modelKodu: product.modelKodu,
            productName: product.productName,
            imageUrl: product.imageUrl,
            currentStock: product.currentStock,
            dailySales: Math.round(dailySales * 100) / 100,
            daysUntilEmpty: daysUntilEmpty !== null && daysUntilEmpty !== Infinity
                ? Math.round(daysUntilEmpty * 10) / 10
                : null,
            recommendedOrder,
            targetStockDays: settings.targetStockDays,
            urgency,
            totalRevenue: product.totalRevenue,
            conversionRate: product.conversionRate
        });
    }

    // Sort by urgency
    const urgencyOrder = { 'critical': 0, 'warning': 1, 'no-data': 2, 'ok': 3 };
    return recommendations.sort((a, b) => {
        const orderDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (orderDiff !== 0) return orderDiff;
        return b.totalRevenue - a.totalRevenue;
    });
}

// ============================================
// FULL STATE BUILDER
// ============================================

export function buildAnalyticsState(): AnalyticsState {
    const store = loadStoredData();

    // Combine all report data
    const allRows: RawSaleRow[] = [];
    const loadedReports: AnalyticsState['loadedReports'] = [];

    for (const period of ['daily', 'weekly', 'monthly', 'yearly'] as ReportPeriod[]) {
        const report = store.reports[period];
        if (report && report.data) {
            allRows.push(...report.data);
            loadedReports.push({
                period: report.period,
                uploadDate: report.uploadDate,
                rowCount: report.rowCount
            });
        }
    }

    // Get product list for stock info
    const productList = store.productList?.products;

    // Aggregate
    const byProduct = aggregateByProduct(allRows, productList);
    const byDate = aggregateByDate(allRows);

    return {
        rawRows: allRows,
        byProduct,
        byDate,
        products: Object.values(byProduct).sort((a, b) => b.totalRevenue - a.totalRevenue),
        lastUpdatedAt: new Date().toISOString(),
        loadedReports
    };
}

// ============================================
// FORMATTING UTILITIES
// ============================================

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat('tr-TR').format(value);
}

export function formatPercent(value: number): string {
    return `%${value.toFixed(1)}`;
}

export function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
