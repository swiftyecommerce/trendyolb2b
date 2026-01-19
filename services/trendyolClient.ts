
/**
 * VizyonExcel - Trendyol API Client (Proxy Wrapper)
 */

// Relative path kullanımı 'Failed to fetch' hatalarını önler ve aynı origin üzerinde güvenli çalışır.
const INTERNAL_API_BASE = '/api/trendyol';

interface ProxyRequestParams {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Backend üzerinden Trendyol API'sine güvenli istek atar.
 */
async function fetchFromProxy(endpoint: string, params: Record<string, any>, method: string = 'POST'): Promise<any> {
  const url = `${INTERNAL_API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Hatası (${response.status}): ${text.slice(0, 100)}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Geçersiz yanıt formatı. Beklenen JSON, alınan: ${text.slice(0, 100)}`);
    }

    const data = await response.json();
    return {
      ...data,
      status: response.status,
      ok: data.ok !== undefined ? data.ok : true
    };
  } catch (error: any) {
    console.error(`[Proxy Fetch Error] ${endpoint}:`, error);
    throw error;
  }
}

// --- API EXPORTS ---

export async function syncData(params: ProxyRequestParams) {
  return fetchFromProxy('/sync', params);
}

export async function testConnection(params: ProxyRequestParams) {
  return fetchFromProxy('/test-connection', params);
}

export async function getOrders(params: ProxyRequestParams & { startDate?: number; endDate?: number; size?: number }) {
  return fetchFromProxy('/orders', params);
}

export async function getProducts(params: ProxyRequestParams & { size?: number }) {
  return fetchFromProxy('/products', params);
}
