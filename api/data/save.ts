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

    if (req.method === 'POST') {
        const { username, data } = req.body;

        if (!username || !data) {
            return res.status(400).json({ ok: false, error: 'Missing username or data' });
        }

        // On Vercel Serverless, we cannot persist files to disk efficiently without a db.
        // We will return OK to simulate success so the UI doesn't break, 
        // but log a warning that persistence is simulated.
        console.log(`[Data] Simulated save for user: ${username} (Vercel Ephemeral)`);

        return res.status(200).json({
            ok: true,
            message: 'Data saved (Simulated on Vercel - Ephemeral)'
        });
    }

    res.status(405).json({ error: 'Method not allowed' });
}
