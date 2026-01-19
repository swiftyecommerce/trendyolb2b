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

            let responseText = "";
            let responseJson: any = null;
            let isJson = false;

            // Try reading as text first to capture everything safely
            responseText = await trendyolRes.text();

            try {
                responseJson = JSON.parse(responseText);
                isJson = true;
            } catch (e) {
                isJson = false;
            }

            const payload: any = {
                ok: trendyolRes.ok,
                status: trendyolRes.status,
                usedEndpoint: endpoint,
                supplierIdSent: supplierId,
                authUserSample: apiKey ? apiKey.substring(0, 4) + '***' : 'N/A'
            };

            if (trendyolRes.ok) {
                payload.message = "Bağlantı başarılı, ürün listesi çekildi.";
                if (isJson && responseJson.content) {
                    payload.message += ` (${responseJson.content.length} ürün bulundu)`;
                }
            } else {
                if (trendyolRes.status === 403) {
                    payload.message = "Trendyol API 403 Forbidden. Lütfen Trendyol panelindeki Satıcı ID, API Key ve API Secret bilgilerini ve entegrasyon yetkilerini kontrol edin.";
                    if (!isJson) {
                        payload.rawBodyPreview = responseText.substring(0, 200) || "Boş gövde";
                    } else {
                        payload.message += ` (Detay: ${JSON.stringify(responseJson)})`;
                    }
                } else {
                    // General error logic
                    if (isJson && responseJson.message) {
                        payload.message = `Trendyol Hatası: ${responseJson.message}`;
                    } else if (isJson && responseJson.errors) {
                        payload.message = `Trendyol Hataları: ${JSON.stringify(responseJson.errors)}`;
                    } else {
                        payload.message = `Trendyol API Hatası: ${trendyolRes.status}`;
                        payload.rawBodyPreview = responseText.substring(0, 200);
                    }
                }
            }

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
