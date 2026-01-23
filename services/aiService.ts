// @ts-ignore
import * as GoogleGenAIModule from "@google/genai";
import { ProductStats, ProductTrend } from "../types";

// Initialize Gemini
// Note: In a real app, this should be an env variable accessed securely
// We will look for VITE_GEMINI_API_KEY
// @ts-ignore
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (process?.env?.VITE_GEMINI_API_KEY) || '';

let aiClient: any = null;
let isLegacySDK = false;

try {
    if (API_KEY) {
        console.log("Initializing Gemini AI with Key:", API_KEY.substring(0, 5) + "...");

        // Check for New SDK (@google/genai)
        // @ts-ignore
        if (GoogleGenAIModule.GoogleGenAI) {
            console.log("Detected @google/genai SDK");
            // @ts-ignore
            aiClient = new GoogleGenAIModule.GoogleGenAI({ apiKey: API_KEY });
        }
        // Check for Legacy SDK (@google/generative-ai)
        // @ts-ignore
        else if (GoogleGenAIModule.GoogleGenerativeAI) {
            console.log("Detected @google/generative-ai SDK");
            // @ts-ignore
            aiClient = new GoogleGenAIModule.GoogleGenerativeAI(API_KEY);
            isLegacySDK = true;
        }
    }
} catch (e) {
    console.warn("Failed to initialize Gemini AI:", e);
}

export interface AIAnalysisResult {
    analysis: string;
    actionable_steps: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
}

/**
 * Generates an AI analysis for a specific product based on its stats and trends.
 */
export async function analyzeProductPerformance(
    product: ProductStats,
    trend?: ProductTrend
): Promise<AIAnalysisResult | null> {
    if (!aiClient || !API_KEY) {
        console.warn("Gemini API Key missing or Client not initialized");
        return null;
    }

    try {
        const prompt = `
        Sen uzman bir E-Ticaret Veri Analistisin. Aşağıdaki ürün verilerine bakarak kısa, net ve aksiyon odaklı bir analiz yap.

        ÜRÜN VERİLERİ:
        - Ürün: ${product.productName} (${product.modelKodu})
        - Kategori: ${product.category || 'Belirsiz'}
        - Fiyat: ${product.avgUnitPrice.toFixed(2)} TL
        - Toplam Satış: ${product.totalQuantity} adet
        - Toplam Ciro: ${product.totalRevenue.toFixed(2)} TL
        - Dönüşüm Oranı: %${product.conversionRate.toFixed(2)}
        - Görüntülenme: ${product.totalImpressions}
        - Sepete Ekleme: ${product.totalAddToCart}
        ${trend ? `- Trend Durumu: ${trend.status === 'rising' ? 'Yükselişte 🚀' : trend.status === 'cooling' ? 'Düşüşte 📉' : 'Stabil'}` : ''}
        ${trend?.yoyChange ? `- Yıllık Değişim: %${trend.yoyChange.toFixed(1)}` : ''}

        GÖREV:
        1. Bu ürünün performansını 1 cümleyle özetle.
        2. "Neden satmıyor?" veya "Neden çok satıyor?" sorusuna verilerden yola çıkarak cevap ver.
        3. Satışı artırmak veya stoğu yönetmek için 3 tane çok somut aksiyon önerisi ver (Maddeler halinde).

        ÇIKTI FORMATI (JSON):
        {
            "analysis": "Kısa özet ve yorum...",
            "actionable_steps": ["Adım 1", "Adım 2", "Adım 3"],
            "sentiment": "positive" | "negative" | "neutral"
        }
        Response MUST be pure JSON, no markdown.
        `;

        let text = '';

        if (!isLegacySDK) {
            // New SDK Usage (@google/genai)
            const response = await aiClient.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            text = response.text ? response.text() :
                (response.candidates?.[0]?.content?.parts?.[0]?.text || '');

        } else {
            // Legacy SDK Usage (@google/generative-ai)
            const model = aiClient.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text();
        }

        // Extract JSON from response (remove markdown blocks if present)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanText) as AIAnalysisResult;

    } catch (error: any) {
        console.error("AI Analysis failed. Full Error Details:", {
            message: error.message,
            name: error.name,
            stack: error.stack,
            raw: error
        });

        let errorMessage = "Yapay zeka analiz yaparken bir hata oluştu.";
        let actionableSteps = ["Lütfen daha sonra tekrar deneyin", "Bağlantınızı kontrol edin"];

        if (error.message?.includes('API key not valid') || error.message?.includes('403')) {
            errorMessage = "API Anahtarı geçersiz veya yetkisiz.";
            actionableSteps = ["API Anahtarınızı .env dosyasında kontrol edin", "Kotanızı kontrol edin"];
        } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
            errorMessage = "Ağ bağlantı hatası.";
            actionableSteps = ["İnternet bağlantınızı kontrol edin", "VPN kullanıyorsanız kapatmayı deneyin"];
        }

        return {
            analysis: errorMessage,
            actionable_steps: actionableSteps,
            sentiment: "neutral"
        };
    }
}
