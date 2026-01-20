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
  data: RawSaleRow[];
}

export interface ExcelDataStore {
  reports: Record<ReportPeriod, UploadedReport | undefined>;
  productList?: {
    uploadDate: string;
    products: RawSaleRow[];
  };
}
