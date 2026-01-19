
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
  corsProxy?: string; // CORS engellerini aşmak için opsiyonel proxy URL
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
    estimatedStockLife: number; // days
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

export interface CartItem extends Product {
  orderQuantity: number;
  isOverridden?: boolean;
  roiEstimate: number; // estimated days to sell this batch
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  PRD = 'prd',
  CART = 'cart',
  INTEGRATION = 'integration'
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
