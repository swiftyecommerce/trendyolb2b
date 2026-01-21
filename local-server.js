import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const SUPABASE_URL = 'https://btmofcirhoremttsmawo.supabase.co';
const SUPABASE_KEY = 'sb_secret__no6391b4QREilyyU0OI2w_rUevkEd2';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Auth Endpoint
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`[Auth] Login attempt: ${username}`);

    if (username === 'serhat' && password === '123456') {
        return res.json({
            ok: true,
            user: { username: 'serhat', type: 'persistent' }
        });
    }

    if (username === 'demo' && password === 'demo') {
        return res.json({
            ok: true,
            user: { username: 'demo', type: 'session' }
        });
    }

    res.status(401).json({ ok: false, error: 'Geçersiz kullanıcı adı veya şifre' });
});

// Save Data Endpoint
app.post('/api/data/save', async (req, res) => {
    try {
        const { username, data } = req.body;

        if (!username || !data) {
            return res.status(400).json({ ok: false, error: 'Missing username or data' });
        }

        // Only allow persistent users to save
        if (username !== 'serhat') {
            return res.json({ ok: true, message: 'Skipped saving for non-persistent user' });
        }

        const { error } = await supabase
            .from('user_data')
            .upsert({
                username: username,
                data: data,
                updated_at: new Date().toISOString()
            }, { onConflict: 'username' });

        if (error) {
            console.error('[Supabase Save Error]', error);
            throw error;
        }

        console.log(`[Data] Saved data for user: ${username} to Supabase`);
        res.json({ ok: true });

    } catch (err) {
        console.error('[Data Save Error]', err);
        res.status(500).json({ ok: false, error: 'Failed to save data' });
    }
});

// Load Data Endpoint
app.get('/api/data/load/:username', async (req, res) => {
    try {
        const { username } = req.params;

        if (username !== 'serhat') {
            return res.json({ ok: true, data: null });
        }

        const { data: dbData, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('username', username)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found" (0 rows)
            console.error('[Supabase Load Error]', error);
            throw error;
        }

        if (!dbData) {
            console.log(`[Data] No data found for user: ${username}`);
            return res.json({ ok: true, data: null });
        }

        console.log(`[Data] Loaded data for user: ${username} from Supabase`);
        res.json({ ok: true, data: dbData.data });

    } catch (err) {
        console.error('[Data Load Error]', err);
        res.status(500).json({ ok: false, error: 'Failed to load data' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Local Trendyol API Server running at http://localhost:${PORT}`);
    console.log(`\n📡 Test endpoint: POST http://localhost:${PORT}/api/trendyol/test-connection`);
});
