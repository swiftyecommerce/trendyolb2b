// ============================================
// CORE ANALYTICS TYPES
// ============================================

// Raw data from Excel parsing
export interface RawSaleRow {
  date: string;          // 'YYYY-MM-DD'
  modelKodu: string;     // unique product identifier
  sku?: string;
  productName: string;
  category?: string;
  brand?: string;
  unitPrice: number;
  quantity: number;
  revenue: number;       // unitPrice * quantity
  cost?: number;
  impressions?: number;
  addToCart?: number;
  sessions?: number;
  returns?: number;
  favorites?: number;
  imageUrl?: string;
  productUrl?: string;
  stock?: number;
  buyboxPrice?: number;
}

// Aggregated stats by product
export interface ProductStats {
  modelKodu: string;
  productName: string;
  category?: string;
  brand?: string;
  imageUrl?: string;
  productUrl?: string;

  // Sales metrics
  totalRevenue: number;
  totalQuantity: number;
  avgUnitPrice: number;
  minPrice: number;
  maxPrice: number;

  // Engagement metrics
  totalImpressions: number;
  totalAddToCart: number;
  totalFavorites: number;

  // Calculated rates
  conversionRate: number;      // quantity / impressions
  viewToCartRate: number;      // addToCart / impressions
  cartToSaleRate: number;      // quantity / addToCart

  // Stock & Cost
  currentStock: number | null;
  buyboxPrice: number | null;
  totalCost?: number;
  grossProfit?: number;
  profitMargin?: number;

  // Segment
  segment: 'A' | 'B' | 'C';
}

// Stock recommendation
export interface StockRecommendation {
  modelKodu: string;
  productName: string;
  imageUrl?: string;

  currentStock: number | null;
  dailySales: number;
  daysUntilEmpty: number | null;
  recommendedOrder: number;
  targetStockDays: number;
  urgency: 'critical' | 'warning' | 'ok' | 'no-data';

  totalRevenue: number;
  conversionRate?: number;
}

// Daily aggregated stats
export interface DayStats {
  date: string;
  totalRevenue: number;
  totalQuantity: number;
  totalImpressions: number;
  totalAddToCart: number;
  orderCount: number;
  aov: number; // average order value
}

// Global analytics state
export interface AnalyticsState {
  rawRows: RawSaleRow[];
  byProduct: Record<string, ProductStats>;
  byDate: Record<string, DayStats>;
  products: ProductStats[];
  lastUpdatedAt?: string;

  // Loaded report info
  loadedReports: {
    period: ReportPeriod;
    uploadDate: string;
    rowCount: number;
    year?: number;   // For monthly historical data
    month?: number;  // For monthly historical data (1-12)
  }[];
}

// App settings
export interface AppSettings {
  targetStockDays: number;          // default 30
  minImpressionsForOpportunity: number; // default 100
  currency: string;                 // 'TRY'
  lowStockThreshold: number;        // default 10
}

// ============================================
// EXISTING TYPES (kept for compatibility)
// ============================================

export interface PotentialAnalysis {
  diagnosis: string;
  actions: string[];
  expectedImpact: string;
}

export type DecisionLabel = 'Sipariş Bas' | 'Optimize Et' | 'Sipariş Verme';
export type ConfidenceLevel = 'Yüksek' | 'Orta' | 'Düşük';

export interface IntegrationConfig {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  isConnected: boolean;
  lastSync?: string;
  corsProxy?: string;
  integrationReferenceCode?: string;
  token?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  sales: number;
  turnover: number;
  views: number;
  addToCart: number;
  favorites: number;
  conversion: number;
  cost: number;
  stock: number;
  trend: number;
  isStockEstimated?: boolean;
  orderRecommendation?: {
    suggestedQty: number;
    confidenceScore: number;
    confidenceLevel: ConfidenceLevel;
    dailyAvgSales: number;
    targetDays: number;
    reasoning: string;
    estimatedStockLife: number;
  };
  aiDecision?: {
    score: number;
    label: DecisionLabel;
    justification: string;
    confidence: number;
    riskLabel: 'Kritik' | 'Orta' | 'Düşük';
  };
  potentialAnalysis?: PotentialAnalysis;
}

export interface CartItem {
  modelKodu: string;
  productName: string;
  imageUrl?: string;
  productUrl?: string;
  quantity: number;
  unitCost?: number;
  totalCost: number;
  recommendedQty?: number;
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  ANALYSIS = 'analysis',
  PRODUCTS = 'products',
  CART = 'cart',
  AI_RECOMMENDATIONS = 'ai_recommendations',
  PURCHASE_ADVISOR = 'purchase_advisor',
  DATA_MANAGEMENT = 'data_management',
  SETTINGS = 'settings'
}

export interface AIAction {
  id: string;
  title: string;
  description: string;
  type: 'order' | 'optimize' | 'risk' | 'opportunity';
  relatedProductIds: string[];
  cta: string;
  filterBy?: DecisionLabel | 'Potential';
}

export interface AIInsightResponse {
  summary: string;
  actions: AIAction[];
}

// ============================================
// EXCEL PARSING TYPES
// ============================================

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface UploadedReport {
  period: ReportPeriod;
  uploadDate: string;
  rowCount: number;
  data?: RawSaleRow[];  // Optional - not stored for historical data
  year?: number;        // For historical monthly data
  month?: number;       // For historical monthly data (1-12)
}

export interface ExcelDataStore {
  // Key can be ReportPeriod or "monthly_YEAR_MONTH" for historical data
  reports: Record<string, UploadedReport | undefined>;
  productList?: {
    uploadDate: string;
    products: RawSaleRow[];
  };
}

// ============================================
// NOTIFICATION SYSTEM TYPES
// ============================================

export type NotificationSeverity = 'critical' | 'high' | 'info';
export type NotificationCategory = 'stock' | 'sales' | 'conversion' | 'trend' | 'data';
export type NotificationStatus = 'new' | 'in_progress' | 'resolved';

export interface NotificationImpact {
  estimatedLostRevenue?: number;    // Tahmini kayıp ciro
  potentialRevenue?: number;         // Potansiyel kazanç
  affectedProductCount?: number;     // Etkilenen ürün sayısı
  affectedRevenue?: number;          // Etkilenen toplam ciro
}

// ============================================
// ANALYSIS TYPES (for notification → proof linkage)
// ============================================

export type AnalysisType =
  | 'yoy-comparison'      // Yıl/yıl karşılaştırma
  | 'cooling-products'    // Soğuyan ürünler (trend aşağı)
  | 'dormant-products'    // 90+ gün satışsız
  | 'rising-products'     // Yükselen ürünler
  | 'conversion-drop'     // Dönüşüm düşüşü
  | 'cart-abandon'        // Sepet terk
  | 'stock-critical'      // Kritik stok
  | 'stock-warning'       // Stok uyarısı
  | 'data-missing';       // Eksik veri

export type ComparisonPeriod = 'yoy' | 'mom' | '7d_vs_30d' | '1d_vs_7d';

export interface AnalysisFilters {
  comparisonPeriod?: ComparisonPeriod;
  threshold?: number;        // % eşik değeri
  minRevenue?: number;       // Min ciro filtresi
  segment?: 'A' | 'B' | 'C';
  urgency?: 'critical' | 'warning';
}

export interface NotificationAction {
  tab: AppTab;
  analysisType: AnalysisType;
  filters?: AnalysisFilters;
  relatedProducts: string[];  // modelKodu listesi - ZORUNLU
}

// ============================================
// MONTHLY DATA STRUCTURE (for YoY comparisons)
// ============================================

export interface MonthlyDataSet {
  year: number;
  month: number;  // 1-12
  label: string;  // "Ocak 2025"
  uploadDate: string;
  rowCount: number;
  totalRevenue: number;
  totalQuantity: number;
  data: RawSaleRow[];
}

export interface YearlyDataCollection {
  year: number;
  months: Partial<Record<number, MonthlyDataSet>>; // 1-12
  totalRevenue: number;
  totalQuantity: number;
}

// Current period data (1D, 7D, 30D)
export type CurrentPeriodType = '1d' | '7d' | '30d';

export interface CurrentPeriodData {
  period: CurrentPeriodType;
  uploadDate: string;
  rowCount: number;
  totalRevenue: number;
  data: RawSaleRow[];
}

// Complete data store with monthly structure
export interface StructuredDataStore {
  // Historical monthly data
  historicalYears: Record<number, YearlyDataCollection>; // year -> data

  // Current period data
  currentPeriods: Partial<Record<CurrentPeriodType, CurrentPeriodData>>;

  // Product master list
  productList?: {
    uploadDate: string;
    products: RawSaleRow[];
  };

  // Metadata
  lastUpdatedAt: string;
}

export interface Notification {
  id: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  status: NotificationStatus;

  title: string;
  description: string;
  metric?: string;              // "₺12.400 kayıp" gibi kısa özet

  // Akıllı önceliklendirme
  priorityScore: number;        // 0-100, yüksek = daha acil

  // Etki metrikleri
  impact?: NotificationImpact;

  // Tıklayınca yönlendirme
  actionRoute?: NotificationAction;

  // İlişkili ürünler
  relatedProducts?: string[];   // modelKodu listesi

  // Zaman damgaları
  createdAt: string;
  readAt?: string;
  resolvedAt?: string;
}

// ============================================
// TIME & COMPARISON TYPES
// ============================================

export interface MonthlyPeriod {
  year: number;
  month: number;              // 1-12
  label: string;              // "Ocak 2025"
  hasData: boolean;
  isExpected: boolean;        // Bu ay için veri bekleniyor mu?
  rowCount?: number;
}

export interface YearlyData {
  year: number;
  months: MonthlyPeriod[];
  totalRevenue: number;
  totalQuantity: number;
}

export interface ComparisonResult {
  modelKodu: string;
  productName: string;
  imageUrl?: string;
  category?: string;

  currentValue: number;
  previousValue: number;
  changePercent: number;
  changeType: 'increase' | 'decrease' | 'stable';

  // Ek metrikler
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
}

// Ürün trend durumu
export type ProductTrendStatus = 'rising' | 'cooling' | 'dormant' | 'stable' | 'new';

export interface ProductTrend {
  modelKodu: string;
  productName: string;
  imageUrl?: string;
  category?: string;

  status: ProductTrendStatus;

  // Kısa dönem (7g vs 30g)
  shortTermRevenue: number;
  longTermRevenue: number;
  shortTermChange: number;      // % değişim

  // Yıllık karşılaştırma
  currentYearRevenue?: number;
  previousYearRevenue?: number;
  yoyChange?: number;           // % değişim

  // Tahmini etki
  estimatedImpact?: number;     // Kayıp veya potansiyel ciro

  // Segment değişimi
  previousSegment?: 'A' | 'B' | 'C';
  currentSegment?: 'A' | 'B' | 'C';
}
