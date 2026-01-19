import { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, message: 'Method Not Allowed' }));
        return;
    }

    try {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        await new Promise((resolve) => req.on('end', resolve));

        const data = JSON.parse(body);
        const { supplierId, apiKey, apiSecret } = data;

        if (!supplierId || !apiKey || !apiSecret) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, message: "Eksik bilgi: supplierId, apiKey ve apiSecret zorunludur." }));
            return;
        }

        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const endpoint = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/addresses`;

        // 1) Server-side Request Log
        console.log("--- TRENDYOL API REQUEST DEBUG ---");
        console.log("URL:", endpoint);
        console.log("Method:", "GET");
        console.log("Headers (Keys):", Object.keys({
            'Authorization': 'HIDDEN',
            'User-Agent': `${supplierId} - SelfIntegration`
        }));
        console.log("Auth Header Exists:", !!auth);
        console.log("Supplier ID:", supplierId);
        console.log("----------------------------------");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const trendyolRes = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'User-Agent': `${supplierId} - SelfIntegration`
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            // 2) Server-side Response Log
            console.log("--- TRENDYOL API RESPONSE DEBUG ---");
            console.log("Status:", trendyolRes.status);
            console.log("Status Text:", trendyolRes.statusText);

            let responseBody = null;
            try {
                responseBody = await trendyolRes.json();
                console.log("Body:", JSON.stringify(responseBody).slice(0, 200) + "...");
            } catch (e) {
                console.log("Body: (Non-JSON or Empty)");
            }
            console.log("-----------------------------------");

            if (trendyolRes.ok) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    ok: true,
                    message: "Trendyol API bağlantısı başarılı",
                    status: 200
                }));
            } else {
                // 3) Enrich JSON with debug info if 403 or error
                const isForbidden = trendyolRes.status === 403;
                const errorMessage = isForbidden
                    ? "Trendyol API 403 Forbidden. Yetki veya endpoint sorunu."
                    : `Trendyol API hatası: ${trendyolRes.status} - ${trendyolRes.statusText || 'Bilinmeyen Hata'}`;

                const payload: any = {
                    ok: false,
                    message: errorMessage,
                    status: trendyolRes.status
                };

                if (isForbidden) {
                    payload.debug = {
                        status: 403,
                        endpoint: endpoint,
                        authHeaderExists: !!auth,
                        responseBody: responseBody
                    };
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(payload));
            }

        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const isTimeout = fetchError.name === 'AbortError';
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                ok: false,
                message: isTimeout ? "Zaman aşımı: Trendyol yanıt vermedi (15sn)." : `Ağ hatası: Trendyol'a erişilemedi (${fetchError.message}).`,
                status: 0
            }));
        }

    } catch (error) {
        console.error("Critical Error in test-connection:", error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            ok: false,
            message: "Test bağlantısı sırasında beklenmeyen bir hata oluştu."
        }));
    }
}
