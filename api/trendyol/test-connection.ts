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
        const endpoint = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products?page=0&size=1`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const trendyolRes = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            let responseMessage = "";

            // Try to parse JSON body
            try {
                const jsonBody = await trendyolRes.json();
                // If Trendyol returns a message or valid json, stringify it lightly or grab message
                if (jsonBody && typeof jsonBody === 'object') {
                    // Common Trendyol error format often has 'errors' array or 'message'
                    if (jsonBody.message) responseMessage = jsonBody.message;
                    else if (jsonBody.errors && Array.isArray(jsonBody.errors)) responseMessage = JSON.stringify(jsonBody.errors);
                    else responseMessage = "Trendyol'dan JSON yanıt döndü (Detaylar debug alanında)";
                } else {
                    responseMessage = String(jsonBody);
                }
            } catch (e) {
                // Text parsing if JSON fails
                try {
                    const textBody = await trendyolRes.text(); // fetch body might be consumed already if json() failed? 
                    // Actually if json() fails, body is consumed. We can't re-read easily in standard fetch polyfills unless we cloned. 
                    // But typically json() throws on invalid json.
                    // In Node fetch, we might not be able to read again. 
                    // Let's assume if json() failed, we can't read text easily without cloning first. 
                    // Or we accept we can't read body. 
                    // However, let's try to handle it safer by cloning if possible or just catching.
                    // For Vercel Edge/Node environment, simpler is safer:
                    responseMessage = `Raw response (JSON parse failed) - Status: ${trendyolRes.status}`;
                } catch (textError) {
                    responseMessage = "Response body okunamadı.";
                }
            }

            // Refined Logic: If successful (200), we probably want a success message
            if (trendyolRes.ok) {
                responseMessage = responseMessage || "Bağlantı başarılı, ürün listesi çekildi.";
            } else {
                responseMessage = responseMessage || `Trendyol API Hatası: ${trendyolRes.status}`;
            }

            const payload = {
                ok: trendyolRes.ok,
                status: trendyolRes.status,
                usedEndpoint: endpoint,
                supplierIdSent: supplierId,
                authUserSample: apiKey ? apiKey.substring(0, 4) + '***' : 'N/A',
                message: responseMessage
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));

        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const isTimeout = fetchError.name === 'AbortError';

            const payload = {
                ok: false,
                status: 0,
                usedEndpoint: endpoint,
                supplierIdSent: supplierId,
                authUserSample: apiKey ? apiKey.substring(0, 4) + '***' : 'N/A',
                message: isTimeout ? "Zaman aşımı: Trendyol yanıt vermedi (15sn)." : `Ağ hatası: Trendyol'a erişilemedi (${fetchError.message}).`
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
        }

    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            ok: false,
            message: "Test bağlantısı sırasında beklenmeyen bir hata oluştu."
        }));
    }
}
