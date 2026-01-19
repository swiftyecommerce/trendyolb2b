
import { IncomingMessage, ServerResponse } from 'http';
import { getTrendyolHeaders } from '../../lib/trendyol-backend';

// Helper to ensure JSON response
const sendJson = (res: ServerResponse, status: number, data: any) => {
    if (!res.headersSent) {
        res.statusCode = status; // Start with the error status (e.g. 403), but handle carefully
        // User requested: res.status(response.status).json({...})
        // So we should mirror the Trendyol status code if possible, or 200 if we want to process it in frontend logic cleanly?
        // User's example: res.status(response.status).json(...)
        // But if I return 403 to frontend, browser might just show error in console. 
        // Standard practice for "proxy" endpoints finding an error upstream is often 200 with ok:false, 
        // OR standard HTTP proxy 403.
        // The user specifically asked: "res.status(response.status).json({...})"
        // Make sure frontend can read the body of a 403 response.

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

        // 1. Get Headers
        const headers = getTrendyolHeaders({ supplierId, apiKey, apiSecret });

        // 2. Endpoint: suppliers/{id}
        const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}`;
        console.log(`FETCHING: ${url}`);

        // 3. Strict Fetch
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        const text = await response.text();

        // 4. Handle Response
        if (response.status !== 200) {
            // Error handling logic as requested
            let parsed = null;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                parsed = null;
            }

            if (parsed) {
                // JSON Error Response
                return sendJson(res, response.status, {
                    ok: false,
                    source: "trendyol",
                    status: response.status,
                    body: parsed,
                    message: parsed.message || "Trendyol Hatası"
                });
            } else {
                // Raw Error Response
                return sendJson(res, response.status, {
                    ok: false,
                    source: "trendyol",
                    status: response.status,
                    raw: text.slice(0, 500),
                    message: `Trendyol Hatası (${response.status})`
                });
            }
        }

        // Success (200)
        let parsedSuccess = null;
        try {
            parsedSuccess = JSON.parse(text);
        } catch (e) {
            // Even 200 OK could theoretically be non-JSON? Unlikely for API but possible.
            return sendJson(res, 200, {
                ok: true, // It was 200 OK
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

    } catch (error: any) {
        console.error("TEST-CONNECTION ERROR:", error);
        sendJson(res, 500, {
            ok: false,
            message: "Sunucu hatası",
            detail: error.message || String(error)
        });
    }
}
