/**
 * Local Development Server for Trendyol API
 * Run with: node local-server.js
 * This bypasses Cloudflare by using your local IP
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Trendyol Test Connection Endpoint
app.post('/api/trendyol/test-connection', async (req, res) => {
    try {
        const { supplierId, apiKey, apiSecret } = req.body;

        if (!supplierId || !apiKey || !apiSecret) {
            return res.json({
                ok: false,
                error: 'Missing required fields: supplierId, apiKey, apiSecret'
            });
        }

        // Build auth header
        const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

        // Trendyol API request - CORRECT ENDPOINT PATH
        const trendyolUrl = `https://apigw.trendyol.com/integration/product/sellers/${supplierId}/products?size=1&page=0`;

        console.log(`[Trendyol] Fetching: ${trendyolUrl}`);

        const response = await fetch(trendyolUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'User-Agent': `${supplierId} - SelfIntegration`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-agentname': 'SelfIntegration',
                'x-correlationid': crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
            }
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        console.log(`[Trendyol] Status: ${response.status}, Content-Type: ${contentType}`);

        // Handle response
        if (contentType.includes('text/html')) {
            return res.json({
                ok: false,
                status: response.status,
                error: 'HTML response (Cloudflare block)',
                hamCevapTipi: 'html403',
                contentType,
                rawSnippet: text.slice(0, 400)
            });
        }

        if (!contentType.includes('application/json')) {
            return res.json({
                ok: false,
                status: response.status,
                error: 'Non-JSON response',
                contentType,
                rawSnippet: text.slice(0, 400)
            });
        }

        let jsonData;
        try {
            jsonData = JSON.parse(text);
        } catch (e) {
            return res.json({
                ok: false,
                status: response.status,
                error: 'JSON parse error',
                rawSnippet: text.slice(0, 400)
            });
        }

        if (response.ok) {
            res.json({
                ok: true,
                status: response.status,
                message: 'Bağlantı başarılı!',
                data: jsonData
            });
        } else {
            res.json({
                ok: false,
                status: response.status,
                error: jsonData.message || 'Trendyol API error',
                data: jsonData
            });
        }

    } catch (err) {
        console.error('[Server Error]', err.message);
        res.json({
            ok: false,
            error: err.message || 'Server error',
            status: 500
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Local Trendyol API Server running at http://localhost:${PORT}`);
    console.log(`\n📡 Test endpoint: POST http://localhost:${PORT}/api/trendyol/test-connection`);
    console.log(`\nBody: { "supplierId": "xxx", "apiKey": "xxx", "apiSecret": "xxx" }\n`);
});
