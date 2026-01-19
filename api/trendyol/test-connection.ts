
import { IncomingMessage, ServerResponse } from 'http';
import { requestTrendyol } from '../../lib/trendyol-backend';

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
        const { supplierId, apiKey, apiSecret, integrationReferenceCode, token } = data;

        if (!supplierId || !apiKey || !apiSecret) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, message: "Eksik bilgi: supplierId, apiKey ve apiSecret zorunludur." }));
            return;
        }

        // Use "addresses" endpoint as it's safe query often used for pinging valid credentials
        // Note: User asked for "harmless GET like cargo or brands". 
        // "suppliers/{id}/addresses" is specific to the supplier, verifying the credentials belong to that supplier.
        // "shipment-providers" is another option but might not need supplierId in path.
        // Let's use `suppliers/${supplierId}/addresses` as intended connection test.
        const endpoint = `/suppliers/${supplierId}/addresses`;

        const result = await requestTrendyol(endpoint, 'GET', {
            supplierId,
            apiKey,
            apiSecret,
            integrationReferenceCode,
            token
        });

        // Construct user-facing response
        const payload: any = {
            ok: result.ok,
            status: result.status,
            usedEndpoint: `https://api.trendyol.com/sapigw${endpoint}`,
            supplierIdSent: supplierId,
            authUserSample: apiKey ? apiKey.substring(0, 4) + '***' : 'N/A',
            message: result.message || (result.ok ? "Bağlantı başarılı (Adres listesi alındı)" : "Hata detayları için alta bakınız")
        };

        if (!result.ok) {
            // Safe truncated body preview
            payload.detail = result.rawBody ? result.rawBody.substring(0, 300) : "No body returned";

            if (result.status === 403) {
                payload.message = "403 Forbidden: Yetki Hatası.";
            }
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));

    } catch (error) {
        console.error("Test function error:", error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            ok: false,
            message: "Test sırasında sunucu içi hata oluştu."
        }));
    }
}
