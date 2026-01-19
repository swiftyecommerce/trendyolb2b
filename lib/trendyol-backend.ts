
export interface TrendyolRequestConfig {
    supplierId: string;
    apiKey: string;
    apiSecret: string;
}

// Edge-compatible Base64 encoding (no Buffer)
function toBase64(str: string): string {
    // btoa works in Edge runtime
    return btoa(str);
}

export function getTrendyolHeaders(config: TrendyolRequestConfig) {
    const { supplierId, apiKey, apiSecret } = config;

    // Edge-compatible Base64
    const credentials = toBase64(`${apiKey}:${apiSecret}`);

    return {
        "Authorization": `Basic ${credentials}`,
        "User-Agent": `${supplierId} - VizyonExcel`,
        "Content-Type": "application/json",
        "Accept": "application/json",
    };
}
