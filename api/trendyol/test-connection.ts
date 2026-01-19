
import { IncomingMessage, ServerResponse } from 'http';
import { getTrendyolHeaders } from '../../lib/trendyol-backend';

// Helper to ensure JSON response
const sendJson = (res: ServerResponse, status: number, data: any) => {
    if (!res.headersSent) {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    }
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    // OUTERMOST try-catch for bulletproof error handling
    try {
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
            return sendJson(res, 405, { ok: false, message: 'Method Not Allowed' });
        }

        // Read Body
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        await new Promise((resolve) => req.on('end', resolve));

        let data;
        try {
            data = JSON.parse(body);
        } catch (e) {
            return sendJson(res, 400, { ok: false, message: 'Invalid JSON request body' });
        }

        const { supplierId, apiKey, apiSecret } = data;

        if (!supplierId || !apiKey || !apiSecret) {
            return sendJson(res, 400, { ok: false, message: "Eksik bilgi: supplierId, apiKey, apiSecret" });
        }

        // Get Headers
        const headers = getTrendyolHeaders({ supplierId, apiKey, apiSecret });

        // Endpoint
        const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}`;
        console.log(`FETCHING: ${url}`);

        // Fetch
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        const text = await response.text();

        // Handle Response
        if (response.status !== 200) {
            let parsed = null;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                parsed = null;
            }

            if (parsed) {
                return sendJson(res, 200, {
                    ok: false,
                    source: "trendyol",
                    status: response.status,
                    body: parsed,
                    message: parsed.message || "Trendyol Hatası"
                });
            } else {
                return sendJson(res, 200, {
                    ok: false,
                    source: "trendyol",
                    status: response.status,
                    raw: text.slice(0, 500),
                    message: `Trendyol Hatası (${response.status})`
                });
            }
        }

        // Success
        let parsedSuccess = null;
        try {
            parsedSuccess = JSON.parse(text);
        } catch (e) {
            return sendJson(res, 200, {
                ok: true,
                status: 200,
                message: "Bağlantı başarılı ancak JSON parse edilemedi.",
                raw: text.slice(0, 500)
            });
        }

        sendJson(res, 200, {
            ok: true,
            source: "trendyol",
            status: 200,
            body: parsedSuccess,
            message: "Bağlantı başarılı: Satıcı bilgileri alındı."
        });

    } catch (err: any) {
        // BULLETPROOF CATCH - This must ALWAYS return JSON
        console.error("CRITICAL HANDLER ERROR:", err);
        sendJson(res, 500, {
            ok: false,
            source: "backend",
            message: err?.message || "Unknown server error",
            stack: err?.stack ? err.stack.substring(0, 500) : null,
            type: typeof err
        });
    }
}
