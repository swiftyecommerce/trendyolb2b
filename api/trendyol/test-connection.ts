// Edge Runtime - Real Trendyol API Connection Test
export const config = {
    runtime: 'edge',
};

export default async function handler() {
    try {
        // 1. Read env vars
        const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
        const apiKey = process.env.TRENDYOL_API_KEY;
        const apiSecret = process.env.TRENDYOL_API_SECRET;

        if (!supplierId || !apiKey || !apiSecret) {
            return Response.json({
                ok: false,
                source: "backend",
                message: "Missing env variables: TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, or TRENDYOL_API_SECRET"
            }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 2. Auth header (Edge-compatible btoa)
        const credentials = btoa(`${apiKey}:${apiSecret}`);

        // 3. Fetch Trendyol API
        const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'User-Agent': `${supplierId} - VizyonExcel`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const text = await response.text();

        // 4. Handle response
        if (response.ok) {
            let data = null;
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = text;
            }

            return new Response(
                JSON.stringify({
                    ok: true,
                    source: "trendyol",
                    status: response.status,
                    data: data
                }),
                { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
        } else {
            // Error from Trendyol
            let parsed = null;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                parsed = null;
            }

            if (parsed) {
                return new Response(
                    JSON.stringify({
                        ok: false,
                        source: "trendyol",
                        status: response.status,
                        body: parsed
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
                );
            } else {
                return new Response(
                    JSON.stringify({
                        ok: false,
                        source: "trendyol",
                        status: response.status,
                        raw: text.slice(0, 500)
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
                );
            }
        }

    } catch (err: any) {
        // Bulletproof catch
        return new Response(
            JSON.stringify({
                ok: false,
                source: "backend",
                message: err?.message || "Unknown error",
                stack: err?.stack ? err.stack.slice(0, 300) : null
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
