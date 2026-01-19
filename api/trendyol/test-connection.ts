// Minimal Edge-safe endpoint - NO Node.js APIs, NO fetch, NO external calls
export const config = {
    runtime: 'edge',
};

export default function handler() {
    return new Response(
        JSON.stringify({
            ok: true,
            message: "backend alive",
            runtime: "edge-safe"
        }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        }
    );
}
