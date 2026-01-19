
import { IncomingMessage, ServerResponse } from 'http';

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
        console.log("TEST-CONNECTION: Start");

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

        // 1. Auth Header
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

        // 2. Endpoint: suppliers/{id}
        const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}`;

        console.log(`FETCHING: ${url}`);

        // 3. Strict Fetch
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'VizyonExcel/1.0',
                'Content-Type': 'application/json'
            }
        });

        const text = await response.text();
        let jsonBody: any = null;
        try {
            if (text && text.trim().length > 0) {
                jsonBody = JSON.parse(text);
            }
        } catch (e) {
            jsonBody = null;
        }

        // 4 & 5. Construct Response
        const payload: any = {
            ok: response.ok,
            status: response.status,
            requestId: response.headers.get('x-request-id') || undefined,
        };

        if (jsonBody) {
            payload.body = jsonBody;
            if (response.ok) {
                payload.message = "Bağlantı başarılı: Satıcı bilgileri alındı.";
            } else {
                payload.message = jsonBody.message || "Trendyol API Hatası";
            }
        } else {
            // Non-JSON Response (HTML or raw text)
            payload.ok = false;
            payload.source = "trendyol"; // Marking source
            payload.raw = text.substring(0, 1000); // Send first 1000 chars
            payload.message = `Trendyol JSON dönmedi (${response.status})`;
        }

        // Return to frontend with 200 OK so frontend parses JSON successfully
        // The actual API status is in payload.status
        sendJson(res, 200, payload);

    } catch (error: any) {
        console.error("TEST-CONNECTION ERROR:", error);
        sendJson(res, 500, {
            ok: false,
            message: "Sunucu hatası",
            detail: error.message || String(error)
        });
    }
}
