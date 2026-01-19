
export interface TrendyolRequestConfig {
    supplierId: string;
    apiKey: string;
    apiSecret: string;
    integrationReferenceCode?: string;
    token?: string;
}

export interface TrendyolResponse<T = any> {
    ok: boolean;
    status: number;
    data?: T;
    message?: string;
    rawBody?: string;
}

const BASE_URL = 'https://api.trendyol.com/sapigw';

/**
 * Standardized Trendyol API Request Handler
 */
export async function requestTrendyol<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    config: TrendyolRequestConfig,
    bodyData?: any
): Promise<TrendyolResponse<T>> {

    const { supplierId, apiKey, apiSecret, integrationReferenceCode, token } = config;

    // 1. Auth Strategy (Default: apiKey:apiSecret)
    // To switch later if needed, we could use `${supplierId}-${apiKey}:${apiSecret}`
    const authString = `${apiKey}:${apiSecret}`;
    const auth = Buffer.from(authString).toString('base64');

    // 2. Mandatory User-Agent
    let userAgent = `${supplierId} - VizyonExcel - support@vizyonexcel.com`;
    if (integrationReferenceCode) {
        userAgent += ` - ${integrationReferenceCode}`;
    }

    // 3. Headers
    const headers: Record<string, string> = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': userAgent
    };

    // Optional Integration headers if provided
    if (integrationReferenceCode) {
        headers['X-Integration-Reference'] = integrationReferenceCode;
    }
    if (token) {
        headers['X-Integration-Token'] = token;
    }

    const url = `${BASE_URL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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

        // Safe Body Reading
        const text = await res.text();
        result.rawBody = text; // Keep raw body for debugging especially on 403

        try {
            if (text && text.trim().length > 0) {
                const json = JSON.parse(text);
                result.data = json;
                // Try to find a message in common places
                if (json.message) result.message = json.message;
                else if (json.errors && Array.isArray(json.errors)) result.message = JSON.stringify(json.errors);
            }
        } catch (e) {
            // Not JSON
            result.message = text.substring(0, 300); // Extract preview
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
