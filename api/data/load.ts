import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        const { username } = req.query;

        if (username !== 'serhat') {
            return res.status(200).json({ ok: true, data: null });
        }

        // On Vercel, since we can't read what we saved (ephemeral), 
        // we return null (no saved data) to avoid errors.
        console.log(`[Data] Load attempted for user: ${username} (Vercel Ephemeral)`);

        return res.status(200).json({
            ok: true,
            data: null,
            message: 'No persistent data on Vercel serverless environment'
        });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
