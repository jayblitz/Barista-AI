import crypto from "crypto";

const BASE_URL = "https://api.monday.trade";
const CHAIN_ID = 143;

interface MondayApiConfig {
  apiKey: string;
  apiSecret: string;
}

interface FundingRateEntry {
  symbol: string;
  fundingRate: string;
  timestamp: number;
  fundingInterval?: number;
}

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  requestId: string;
}

function getConfig(): MondayApiConfig | null {
  const apiKey = process.env.MONDAY_API_KEY;
  const apiSecret = process.env.MONDAY_API_SECRET;
  if (!apiKey || !apiSecret) {
    return null;
  }
  return { apiKey, apiSecret };
}

function sortQueryString(queryString: string): string {
  if (!queryString) return "";
  const pairs = queryString.split("&");
  const parsed: Array<[string, string]> = pairs.map(pair => {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) return [pair, ""];
    return [pair.substring(0, eqIndex), pair.substring(eqIndex + 1)];
  });
  parsed.sort((a, b) => a[0].localeCompare(b[0]));
  return parsed.map(([k, v]) => `${k}=${v}`).join("&");
}

function generateSignature(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ""
): string {
  const upperMethod = method.toUpperCase();

  let finalPath = requestPath;
  if (upperMethod === "GET" && requestPath.includes("?")) {
    const [path, query] = requestPath.split("?", 2);
    finalPath = `${path}?${sortQueryString(query)}`;
  }

  let finalBody = body;
  if (["POST", "PUT", "PATCH"].includes(upperMethod) && body) {
    try {
      const parsed = JSON.parse(body);
      const sortedKeys = Object.keys(parsed).sort();
      const sorted: Record<string, unknown> = {};
      for (const key of sortedKeys) {
        sorted[key] = parsed[key];
      }
      finalBody = JSON.stringify(sorted);
    } catch {
      // keep original
    }
  }

  const message = timestamp + upperMethod + finalPath + finalBody;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);
  return hmac.digest("base64");
}

function getHeaders(config: MondayApiConfig, method: string, path: string, body: string = ""): Record<string, string> {
  const timestamp = String(Date.now());
  const signature = generateSignature(config.apiSecret, timestamp, method, path, body);
  return {
    "X-Api-Key": config.apiKey,
    "X-Api-Sign": signature,
    "X-Api-Ts": timestamp,
    "X-Chain-Id": String(CHAIN_ID),
    "Content-Type": "application/json",
  };
}

export async function fetchFundingRateHistory(symbol: string = "MON/USDC"): Promise<FundingRateEntry[] | null> {
  const config = getConfig();
  if (!config) {
    console.log("[MONDAY API] API credentials not configured");
    return null;
  }

  const path = `/v4/public/mm/funding/history?symbol=${encodeURIComponent(symbol)}`;
  const headers = getHeaders(config, "GET", path);

  try {
    const response = await fetch(`${BASE_URL}${path}`, { headers, signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      console.error(`[MONDAY API] Funding rate request failed: ${response.status}`);
      return null;
    }

    const json = await response.json() as ApiResponse<FundingRateEntry[]>;

    if (json.code !== 0 && json.code !== 200) {
      console.error(`[MONDAY API] API error: code=${json.code} msg=${json.msg}`);
      return null;
    }

    return json.data || [];
  } catch (error) {
    console.error("[MONDAY API] Fetch error:", error);
    return null;
  }
}

export function isConfigured(): boolean {
  return !!process.env.MONDAY_API_KEY && !!process.env.MONDAY_API_SECRET;
}
