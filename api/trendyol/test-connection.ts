// Edge Runtime - Trendyol API Connection Test (POST with form data)
export const config = {
    runtime: 'edge',
};

const TRENDYOL_BASE_URL = "https://api.trendyol.com/sapigw";

export default async function handler(request: Request) {
    // CORS for preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    try {
        // 1. Only accept POST
        if (request.method !== 'POST') {
            return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
        }

        // 2. Parse request body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return Response.json({ ok: false, error: 'Invalid JSON in request body' }, { status: 400 });
        }

        const { supplierId, apiKey, apiSecret } = body;

        if (!supplierId || !apiKey || !apiSecret) {
            return Response.json({
                ok: false,
                error: 'Missing required fields: supplierId, apiKey, apiSecret'
            }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // 3. Build auth header (Edge-compatible btoa)
        const credentials = btoa(`${apiKey}:${apiSecret}`);

        // 4. Trendyol API request - small GET
        const trendyolUrl = `${TRENDYOL_BASE_URL}/suppliers/${supplierId}/products?size=1&page=0`;

        console.log(`[Trendyol] Fetching: ${trendyolUrl}`);

        const trendyolRes = await fetch(trendyolUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'User-Agent': `VizyonExcel/1.0 (supplierId=${supplierId})`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const contentType = trendyolRes.headers.get('content-type') || '';
        const responseText = await trendyolRes.text();

        console.log(`[Trendyol] Status: ${trendyolRes.status}, Content-Type: ${contentType}`);

        // 5. Check for HTML 4xx (Cloudflare/403)
        if (contentType.includes('text/html') && trendyolRes.status >= 400 && trendyolRes.status < 500) {
            return Response.json({
                ok: false,
                status: trendyolRes.status,
                error: 'TRENDYOL_HTML_4XX',
                hamCevapTipi: 'html403',
                contentType: contentType,
                rawSnippet: responseText.slice(0, 400)
            }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // 6. Non-JSON response
        if (!contentType.includes('application/json')) {
            return Response.json({
                ok: false,
                status: trendyolRes.status,
                error: 'Trendyol JSON dönmedi',
                contentType: contentType,
                rawSnippet: responseText.slice(0, 400)
            }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // 7. Parse JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseText);
        } catch (e) {
            return Response.json({
                ok: false,
                status: trendyolRes.status,
                error: 'JSON parse hatası',
                rawSnippet: responseText.slice(0, 400)
            }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // 8. Success or Trendyol error (but JSON)
        if (trendyolRes.ok) {
            return Response.json({
                ok: true,
                status: trendyolRes.status,
                message: 'Bağlantı başarılı',
                data: jsonData
            }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
        } else {
            return Response.json({
                ok: false,
                status: trendyolRes.status,
                error: jsonData.message || 'Trendyol API hatası',
                data: jsonData
            }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

    } catch (err: any) {
        console.error('[Trendyol] Critical error:', err?.message);
        return Response.json({
            ok: false,
            error: err?.message || 'Sunucu hatası',
            status: 500
        }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
}
