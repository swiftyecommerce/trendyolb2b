/**
 * VizyonExcel - Trendyol API Client
 * Direct calls to Trendyol API with proper headers
 */

const TRENDYOL_BASE_URL = "https://apigw.trendyol.com";

interface TrendyolCredentials {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
}

// Edge-compatible Base64 encoding
function base64Encode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Fallback for Node.js (server-side)
  return Buffer.from(str).toString('base64');
}

/**
 * Build required Trendyol headers
 */
function buildTrendyolHeaders(creds: TrendyolCredentials): Record<string, string> {
  const { supplierId, apiKey, apiSecret } = creds;
  return {
    "Authorization": "Basic " + base64Encode(`${apiKey}:${apiSecret}`),
    "User-Agent": `VizyonExcel/1.0 (supplierId=${supplierId})`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };
}

/**
 * Core Trendyol API request function
 * Handles HTML 4xx errors gracefully
 */
export async function trendyolRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  creds: TrendyolCredentials,
  body?: any
): Promise<{ ok: boolean; status: number; data?: T; error?: string; hamCevapTipi?: string; rawSnippet?: string }> {

  const url = `${TRENDYOL_BASE_URL}${endpoint}`;
  const headers = buildTrendyolHeaders(creds);

  console.log(`[Trendyol] ${method} ${url}`);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const contentType = res.headers.get('content-type') || '';

    console.log(`[Trendyol] Status: ${res.status}, Content-Type: ${contentType}`);

    // Check for HTML response on 4xx errors
    if (contentType.includes('text/html') && res.status >= 400 && res.status < 500) {
      const raw = await res.text();
      throw new Error(`TRENDYOL_HTML_4XX::status=${res.status}::${raw.slice(0, 500)}`);
    }

    // Non-JSON response
    if (!contentType.includes('application/json')) {
      const raw = await res.text();
      return {
        ok: false,
        status: res.status,
        error: 'Non-JSON response',
        rawSnippet: raw.slice(0, 500)
      };
    }

    // Parse JSON
    const text = await res.text();
    let data: T;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        ok: false,
        status: res.status,
        error: 'JSON parse error',
        rawSnippet: text.slice(0, 500)
      };
    }

    if (res.ok) {
      return { ok: true, status: res.status, data };
    } else {
      return {
        ok: false,
        status: res.status,
        error: (data as any)?.message || 'Trendyol API error',
        data
      };
    }

  } catch (err: any) {
    // Handle TRENDYOL_HTML_4XX errors
    if (err.message?.startsWith('TRENDYOL_HTML_4XX')) {
      const parts = err.message.split('::');
      return {
        ok: false,
        status: parseInt(parts[1]?.replace('status=', '') || '0'),
        error: 'HTML 4xx response received',
        hamCevapTipi: 'html403',
        rawSnippet: parts[2] || ''
      };
    }

    console.error(`[Trendyol] Error:`, err.message);
    return {
      ok: false,
      status: 0,
      error: err.message || 'Unknown error'
    };
  }
}

// --- CONVENIENCE EXPORTS ---

export async function testConnection(creds: TrendyolCredentials) {
  return trendyolRequest(
    `/suppliers/${creds.supplierId}/products?size=1&page=0`,
    'GET',
    creds
  );
}

export async function getProducts(creds: TrendyolCredentials, size = 50, page = 0) {
  return trendyolRequest(
    `/suppliers/${creds.supplierId}/products?size=${size}&page=${page}`,
    'GET',
    creds
  );
}

export async function getOrders(creds: TrendyolCredentials, startDate?: number, endDate?: number, size = 50) {
  let url = `/suppliers/${creds.supplierId}/orders?size=${size}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  return trendyolRequest(url, 'GET', creds);
}
