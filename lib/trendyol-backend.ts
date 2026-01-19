
export interface TrendyolRequestConfig {
    supplierId: string;
    apiKey: string;
    apiSecret: string;
}

export function getTrendyolHeaders(config: TrendyolRequestConfig) {
    const { supplierId, apiKey, apiSecret } = config;

    // Use UTF-8 to Base64 conversion as requested
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');

    return {
        "Authorization": `Basic ${credentials}`,
        "User-Agent": `${supplierId} - VizyonExcel`,
        "Content-Type": "application/json",
        "Accept": "application/json",
    };
}

export interface TrendyolResponse<T = any> {
    ok: boolean;
    status: number;
    data?: T;
    message?: string;
    rawBody?: string;
}

const BASE_URL = 'https://api.trendyol.com/sapigw';

// Kept for backward compatibility if other files use it, but updated to use the new header helper
export async function requestTrendyol<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    config: TrendyolRequestConfig,
    bodyData?: any
): Promise<TrendyolResponse<T>> {

    const headers = getTrendyolHeaders(config);
    const url = `${BASE_URL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: bodyData ? JSON.stringify(bodyData) : undefined,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result: TrendyolResponse<T> = {
            ok: res.ok,
            status: res.status
        };

        const text = await res.text();
        result.rawBody = text;

        try {
            if (text && text.trim().length > 0) {
                const json = JSON.parse(text);
                result.data = json;
                if (json.message) result.message = json.message;
                else if (json.errors && Array.isArray(json.errors)) result.message = JSON.stringify(json.errors);
            }
        } catch (e) {
            result.message = text.substring(0, 300);
        }

        return result;

    } catch (error: any) {
        clearTimeout(timeoutId);
        return {
            ok: false,
            status: 0,
            message: error.name === 'AbortError'
                ? "Zaman aşımı (15sn)"
                : `Ağ hatası: ${error.message}`
        };
    }
}
