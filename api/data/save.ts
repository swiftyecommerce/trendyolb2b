import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://btmofcirhoremttsmawo.supabase.co';
const SUPABASE_KEY = 'sb_secret__no6391b4QREilyyU0OI2w_rUevkEd2';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        const { username, data } = req.body;

        if (!username || !data) {
            return res.status(400).json({ ok: false, error: 'Missing username or data' });
        }

        if (username !== 'serhat') {
            return res.status(200).json({ ok: true, message: 'Skipped saving for non-persistent user' });
        }

        try {
            const { error } = await supabase
                .from('user_data')
                .upsert({
                    username: username,
                    data: data,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'username' });

            if (error) {
                console.error('[Supabase Save Error]', error);
                return res.status(500).json({ ok: false, error: error.message });
            }

            return res.status(200).json({ ok: true });
        } catch (err: any) {
            console.error('[Supabase Save Error]', err);
            return res.status(500).json({ ok: false, error: err.message });
        }
    }

    res.status(405).json({ error: 'Method not allowed' });
}
