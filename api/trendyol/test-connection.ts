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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const trendyolRes = await fetch(`https://api.trendyol.com/sapigw/suppliers/${supplierId}/addresses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'User-Agent': `${supplierId} - SelfIntegration`
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (trendyolRes.ok) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    ok: true,
                    message: "Trendyol API bağlantısı başarılı",
                    status: 200
                }));
            } else {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    ok: false,
                    message: `Trendyol API hatası: ${trendyolRes.status} - ${trendyolRes.statusText || 'Bilinmeyen Hata'}`,
                    status: trendyolRes.status
                }));
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
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            ok: false,
            message: "Test bağlantısı sırasında beklenmeyen bir hata oluştu."
        }));
    }
}
