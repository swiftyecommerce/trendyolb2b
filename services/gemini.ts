
import { GoogleGenAI, Type } from "@google/genai";
import { Product, AIInsightResponse, ConfidenceLevel, DecisionLabel } from "../types";

// --- CONFIGURATION ---
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; 
const MAX_CONCURRENT_CALLS = 2; 

/**
 * Kota hatasını temsil eden özel hata mesajı.
 */
export const GEMINI_QUOTA_EXHAUSTED = "GEMINI_QUOTA_EXHAUSTED";

// --- QUEUE MANAGEMENT ---
class AIQueueManager {
  private queue: (() => Promise<void>)[] = [];
  private activeCalls = 0;

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        this.activeCalls++;
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeCalls--;
          this.processNext();
        }
      };

      this.queue.push(wrappedTask);
      this.processNext();
    });
  }

  private processNext() {
    if (this.activeCalls < MAX_CONCURRENT_CALLS && this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) nextTask();
    }
  }
}

const queueManager = new AIQueueManager();

// --- UTILS ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 80) return 'Yüksek';
  if (score >= 40) return 'Orta';
  return 'Düşük';
};

/**
 * Üstel geri çekilme ile API çağrısı yapan merkezi fonksiyon.
 * 429 hatası durumunda GEMINI_QUOTA_EXHAUSTED hatası fırlatır.
 */
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error?.message?.includes('429') || 
      error?.status === 'RESOURCE_EXHAUSTED' || 
      error?.message?.includes('quota');

    if (isQuotaError && retries > 0) {
      console.warn(`[Gemini API] Kota hatası algılandı, bekleme: ${delay}ms. Kalan deneme: ${retries}`);
      await sleep(delay);
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }

    if (isQuotaError) {
      throw new Error(GEMINI_QUOTA_EXHAUSTED);
    }

    throw error;
  }
}

// --- SIMULATION / RULE-BASED ENGINE ---
export const simulateOrderRec = (p: Product, targetDays: number) => {
  const dailyAvg = p.sales / 30;
  const needed = Math.ceil(dailyAvg * targetDays);
  const suggestedQty = Math.max(0, needed - p.stock);
  const confidenceScore = 60; 
  
  let reasoning = "Kural Tabanlı: Mevcut satış hızı ve stok dengesine göre hesaplandı.";
  if (p.stock < 10) reasoning = "Kural Tabanlı: Kritik stok sınırı! Acil tedarik planlandı.";
  if (p.trend > 15) reasoning = "Kural Tabanlı: Satış trendi pozitif, stok artırımı önerilir.";

  return {
    id: p.id,
    suggestedQty: suggestedQty || 10,
    confidenceScore,
    confidenceLevel: 'Orta' as ConfidenceLevel,
    dailyAvgSales: dailyAvg || 0.5,
    targetDays,
    reasoning,
    estimatedStockLife: Math.floor(p.stock / (dailyAvg || 0.1)) || 0
  };
};

export const simulateDecision = (p: Product) => {
  let label: DecisionLabel = 'Optimize Et';
  let risk: 'Kritik' | 'Orta' | 'Düşük' = 'Orta';
  let justification = "Kural Tabanlı Karar: Performans metrikleri analiz edildi.";
  
  if (p.stock < 15 && p.sales > 20) {
    label = 'Sipariş Bas';
    risk = 'Kritik';
    justification = "Hızlı eriyen stok ve yüksek satış hızı tespiti.";
  } else if (p.conversion < 0.8 || p.trend < -5) {
    label = 'Sipariş Verme';
    risk = 'Düşük';
    justification = "Düşük dönüşüm oranı. Stok devir hızı riskli.";
  }

  return {
    id: p.id,
    score: 50,
    label,
    justification,
    confidence: 0.6,
    riskLabel: risk
  };
};

// --- API EXPORTS ---

export const getOrderRecommendations = async (products: Product[], targetDays: number = 20) => {
  if (!process.env.API_KEY) return products.map(p => simulateOrderRec(p, targetDays));
  
  return queueManager.enqueue(() => callGeminiWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Trendyol sipariş önerisi üret. Hedef: ${targetDays} gün. Ürün verileri: ${JSON.stringify(products)}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  suggestedQty: { type: Type.NUMBER },
                  confidenceScore: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING },
                  dailyAvgSales: { type: Type.NUMBER },
                  estimatedStockLife: { type: Type.NUMBER }
                },
                required: ['id', 'suggestedQty', 'confidenceScore', 'reasoning']
              }
            }
          },
          required: ['recommendations']
        }
      }
    });
    const result = JSON.parse(response.text || '{"recommendations":[]}');
    return (result.recommendations || []).map((r: any) => ({ ...r, confidenceLevel: getConfidenceLevel(r.confidenceScore) }));
  }));
};

export const getBatchProductDecisions = async (products: Product[]) => {
  if (!process.env.API_KEY) return products.map(p => simulateDecision(p));

  return queueManager.enqueue(() => callGeminiWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Ürünlerin performansına göre stok kararları oluştur. Veriler: ${JSON.stringify(products)}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decisions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  label: { type: Type.STRING },
                  justification: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  riskLabel: { type: Type.STRING }
                },
                required: ['id', 'label', 'justification', 'riskLabel']
              }
            }
          },
          required: ['decisions']
        }
      }
    });
    const parsed = JSON.parse(response.text || '{"decisions":[]}');
    return parsed.decisions;
  }));
};

export const analyzePotentialProducts = async (products: Product[]) => {
  const candidates = products.filter(p => (p.views > 5000 && p.conversion < 2.5) || p.favorites > 1000);
  return candidates.map(p => ({
    id: p.id,
    diagnosis: "Yüksek Görüntülenme / Düşük Dönüşüm",
    actions: ["Fiyatı %5 rekabetçi hale getir", "Görselleri güncelle", "Ücretsiz kargo ekle"],
    expectedImpact: "%12-18 Satış Artışı"
  }));
};

export const getProductInsights = async (products: Product[]): Promise<AIInsightResponse> => {
  const demoData: AIInsightResponse = {
    summary: "Mağaza genelinde trafik yüksek ancak dönüşüm oranı %2.4 ile sektör ortalamasının altında.",
    actions: [
      { id: '1', title: "Kritik Stok Uyarısı", description: "Stoku kritik ürünleri hemen tedarik et", type: 'order', relatedProductIds: [], cta: "SİPARİŞE GİT", filterBy: "Sipariş Bas" },
    ]
  };

  if (!process.env.API_KEY) return demoData;

  return queueManager.enqueue(() => callGeminiWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Trendyol yönetici özeti ve 3 stratejik aksiyon üret. Veriler: ${JSON.stringify(products)}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  type: { type: Type.STRING },
                  relatedProductIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cta: { type: Type.STRING },
                  filterBy: { type: Type.STRING }
                },
                required: ['id', 'title', 'description', 'type', 'relatedProductIds', 'cta']
              }
            }
          },
          required: ['summary', 'actions']
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    return parsed;
  }));
};
