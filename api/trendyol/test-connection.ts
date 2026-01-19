
import { IncomingMessage, ServerResponse } from 'http';
import { requestTrendyol } from '../../lib/trendyol-backend';

// Helper to ensure JSON response
const sendJson = (res: ServerResponse, status: number, data: any) => {
    if (!res.headersSent) {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    }
};

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

    try {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { ok: false, message: 'Method Not Allowed' });
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        await new Promise((resolve) => req.on('end', resolve));

        let data;
        try {
            data = JSON.parse(body);
        } catch (e) {
            return sendJson(res, 400, { ok: false, message: 'Invalid JSON request body' });
        }

        const { supplierId, apiKey, apiSecret, integrationReferenceCode, token } = data;

        if (!supplierId || !apiKey || !apiSecret) {
            return sendJson(res, 400, { ok: false, message: "Eksik bilgi: supplierId, apiKey ve apiSecret zorunludur." });
        }

        // Endpoint selection
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

        sendJson(res, 200, payload);

    } catch (error: any) {
        console.error("Critical Test function error:", error);
        // Bulletproof catch to always return JSON
        sendJson(res, 500, {
            ok: false,
            message: "Test sırasında sunucu içi hata oluştu.",
            detail: error.message || String(error)
        });
    }
}
