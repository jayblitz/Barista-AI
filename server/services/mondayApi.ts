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

interface FundingHistoryApiEntry {
  timestamp: number;
  long: string;
  short: string;
}

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  requestId: string;
  message?: string;
}

interface MarketOrderRequest {
  instrument: string;
  expiry: number;
  size: string;
  side: 1 | 2;
  leverage: string;
  slippageBps: number;
  referralCode?: string;
  deadline?: number;
  gasLimit?: number;
}

interface LimitOrderRequest {
  instrument: string;
  expiry: number;
  size: string;
  price: string;
  side: 1 | 2;
  leverage: string;
  postOnly?: boolean;
  markPriceBufferInBps?: number;
  referralCode?: string;
  deadline?: number;
  gasLimit?: number;
}

interface TradeSubmitResult {
  txHash?: string;
}

export interface ParsedOrderIntent {
  type: "market" | "limit";
  side: 1 | 2;
  sideLabel: "LONG" | "SHORT";
  instrument: string;
  size: string;
  leverage: string;
  price?: string;
}

export interface ChatOrderResult {
  ok: boolean;
  message: string;
  txHash?: string;
  requestId?: string;
  errorCode?: number;
}

function getConfig(): MondayApiConfig | null {
  const apiKey = process.env.MONDAY_API_KEY;
  const apiSecret = process.env.MONDAY_API_SECRET;
  if (!apiKey || !apiSecret) {
    return null;
  }
  return { apiKey, apiSecret };
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "***";
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function sortQueryString(queryString: string): string {
  if (!queryString) return "";
  const pairs = queryString.split("&");
  const parsed: Array<[string, string]> = pairs.map(pair => {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) return [pair, ""];
    return [
      pair.substring(0, eqIndex),
      pair.substring(eqIndex + 1),
    ];
  });
  // Sort by decoded key for stable ordering while preserving original encoding.
  parsed.sort((a, b) => decodeURIComponent(a[0]).localeCompare(decodeURIComponent(b[0])));
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

function logRequest(operation: string, method: string, path: string, body?: string) {
  const payload = {
    operation,
    method,
    url: `${BASE_URL}${path}`,
    path,
    body: body ? JSON.parse(body) : null,
  };
  console.log(`[MONDAY API][REQUEST] ${JSON.stringify(payload)}`);
}

function logResponse(operation: string, status: number, responseBody: unknown, requestId?: string) {
  const payload = {
    operation,
    status,
    requestId: requestId || null,
    response: responseBody,
  };
  console.log(`[MONDAY API][RESPONSE] ${JSON.stringify(payload)}`);
}

async function callSignedEndpoint<T>(
  operation: string,
  method: "GET" | "POST",
  path: string,
  bodyObj?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: ApiResponse<T> | null; raw: string }> {
  const config = getConfig();
  if (!config) {
    throw new Error("Monday API credentials not configured");
  }

  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  const headers = getHeaders(config, method, path, body);

  console.log(
    `[MONDAY API][AUTH] ${JSON.stringify({
      operation,
      apiKey: maskApiKey(config.apiKey),
      chainId: CHAIN_ID,
      timestamp: headers["X-Api-Ts"],
      method,
      path,
    })}`,
  );

  logRequest(operation, method, path, body || undefined);

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body || undefined,
    signal: AbortSignal.timeout(15000),
  });

  const raw = await response.text();
  let parsed: ApiResponse<T> | null = null;
  try {
    parsed = JSON.parse(raw) as ApiResponse<T>;
  } catch {
    parsed = null;
  }

  logResponse(operation, response.status, parsed ?? raw, parsed?.requestId);

  return {
    ok: response.ok && !!parsed && (parsed.code === 0 || parsed.code === 200),
    status: response.status,
    json: parsed,
    raw,
  };
}

export async function fetchFundingRateHistory(symbol: string = "MON/USDC"): Promise<FundingRateEntry[] | null> {
  const config = getConfig();
  if (!config) {
    console.log("[MONDAY API] API credentials not configured");
    return null;
  }

  // Monday API requires chainId in query for this endpoint.
  const path = `/v4/public/trader/market/funding/history?chainId=${CHAIN_ID}&symbol=${encodeURIComponent(symbol)}`;
  const headers = getHeaders(config, "GET", path);

  try {
    const response = await fetch(`${BASE_URL}${path}`, { headers, signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[MONDAY API] Funding rate request failed: ${response.status} - ${errorBody}`);
      return null;
    }

    const json = await response.json() as ApiResponse<FundingHistoryApiEntry[]>;

    if (json.code !== 0 && json.code !== 200) {
      console.error(`[MONDAY API] API error: code=${json.code} msg=${json.msg}`);
      return null;
    }

    const normalized = (json.data || []).map((entry) => ({
      symbol,
      // "long" > 0 means longs pay shorts, favorable for delta-neutral short leg.
      fundingRate: entry.long,
      timestamp: entry.timestamp,
      fundingInterval: 24,
    }));

    return normalized;
  } catch (error) {
    console.error("[MONDAY API] Fetch error:", error);
    return null;
  }
}

export async function fetchInstrumentsInfo(symbol?: string): Promise<Record<string, unknown>[] | null> {
  const config = getConfig();
  if (!config) {
    console.log("[MONDAY API] API credentials not configured");
    return null;
  }

  let path = "/v4/public/trader/market/instruments";
  if (symbol) {
    path += `?symbol=${encodeURIComponent(symbol)}`;
  }
  const headers = getHeaders(config, "GET", path);

  try {
    const response = await fetch(`${BASE_URL}${path}`, { headers, signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      console.error(`[MONDAY API] Instruments info request failed: ${response.status}`);
      return null;
    }

    const json = await response.json() as ApiResponse<Record<string, unknown>[]>;

    if (json.code !== 0 && json.code !== 200) {
      console.error(`[MONDAY API] API error: code=${json.code} msg=${json.msg}`);
      return null;
    }

    return json.data || [];
  } catch (error) {
    console.error("[MONDAY API] Fetch instruments error:", error);
    return null;
  }
}

export function parseOrderIntent(message: string): ParsedOrderIntent | null {
  const text = message.trim();
  const sideMatch = text.match(/\b(long|short)\b/i);
  const sizeSymbolMatch = text.match(/\b(?:long|short)\s+([0-9]*\.?[0-9]+)\s*([A-Za-z]{2,12}(?:\/USDC)?)/i);
  const leverageMatch = text.match(/\b([0-9]*\.?[0-9]+)\s*x\b/i);

  if (!sideMatch || !sizeSymbolMatch || !leverageMatch) {
    return null;
  }

  const sideLabel = sideMatch[1].toUpperCase() as "LONG" | "SHORT";
  const side: 1 | 2 = sideLabel === "LONG" ? 2 : 1;

  const rawSymbol = sizeSymbolMatch[2].toUpperCase();
  const base = rawSymbol.includes("/") ? rawSymbol.split("/")[0] : rawSymbol;
  const supported = new Set(["BTC", "ETH", "MON"]);
  if (!supported.has(base)) {
    return null;
  }

  const size = sizeSymbolMatch[1];
  const leverage = leverageMatch[1];
  const leverageValue = Number(leverage);
  if (!Number.isFinite(leverageValue) || leverageValue <= 0 || leverageValue > 10) {
    return null;
  }

  const priceMatch = text.match(/\b(?:at|@)\s*([0-9]*\.?[0-9]+)\b/i);
  const price = priceMatch?.[1];

  return {
    type: price ? "limit" : "market",
    side,
    sideLabel,
    instrument: `${base}/USDC`,
    size,
    leverage,
    price,
  };
}

export async function createMarketOrder(params: MarketOrderRequest): Promise<ChatOrderResult> {
  const path = "/v4/public/trader/order/market";
  const result = await callSignedEndpoint<TradeSubmitResult>("create_market_order", "POST", path, params as unknown as Record<string, unknown>);

  if (!result.ok || !result.json) {
    const apiMessage = result.json?.msg || result.json?.message;
    return {
      ok: false,
      message: apiMessage || "Failed to place market order",
      requestId: result.json?.requestId,
      errorCode: result.json?.code ?? result.status,
    };
  }

  return {
    ok: true,
    message: "Market order submitted successfully.",
    txHash: result.json.data?.txHash,
    requestId: result.json.requestId,
  };
}

export async function createLimitOrder(params: LimitOrderRequest): Promise<ChatOrderResult> {
  const path = "/v4/public/trader/order/limit";
  const result = await callSignedEndpoint<TradeSubmitResult>("create_limit_order", "POST", path, params as unknown as Record<string, unknown>);

  if (!result.ok || !result.json) {
    const apiMessage = result.json?.msg || result.json?.message;
    return {
      ok: false,
      message: apiMessage || "Failed to place limit order",
      requestId: result.json?.requestId,
      errorCode: result.json?.code ?? result.status,
    };
  }

  return {
    ok: true,
    message: "Limit order submitted successfully.",
    txHash: result.json.data?.txHash,
    requestId: result.json.requestId,
  };
}

export async function executeOrderFromChat(message: string): Promise<ChatOrderResult | null> {
  const intent = parseOrderIntent(message);
  if (!intent) {
    return null;
  }

  console.log(`[CHAT ORDER][INTENT] ${JSON.stringify(intent)}`);

  const isEnabled = process.env.MONDAY_ENABLE_CHAT_TRADING === "true";
  if (!isEnabled) {
    return {
      ok: false,
      message:
        "Order intent detected, but chat trading is disabled. Set MONDAY_ENABLE_CHAT_TRADING=true to enable live order placement.",
    };
  }

  const expiry = 4294967295;
  const deadline = 0;
  const gasLimit = 0;

  if (intent.type === "market") {
    const slippageBps = Number(process.env.MONDAY_DEFAULT_SLIPPAGE_BPS || "10");
    return createMarketOrder({
      instrument: intent.instrument,
      expiry,
      size: intent.size,
      side: intent.side,
      leverage: intent.leverage,
      slippageBps: Number.isFinite(slippageBps) ? slippageBps : 10,
      deadline,
      gasLimit,
    });
  }

  return createLimitOrder({
    instrument: intent.instrument,
    expiry,
    size: intent.size,
    price: intent.price!,
    side: intent.side,
    leverage: intent.leverage,
    postOnly: false,
    deadline,
    gasLimit,
  });
}

export async function submitParsedOrderIntent(intent: ParsedOrderIntent): Promise<ChatOrderResult> {
  const isEnabled = process.env.MONDAY_ENABLE_CHAT_TRADING === "true";
  if (!isEnabled) {
    return {
      ok: false,
      message:
        "Order intent detected, but chat trading is disabled. Set MONDAY_ENABLE_CHAT_TRADING=true to enable live order placement.",
    };
  }

  const expiry = 4294967295;
  const deadline = 0;
  const gasLimit = 0;

  if (intent.type === "market") {
    const slippageBps = Number(process.env.MONDAY_DEFAULT_SLIPPAGE_BPS || "10");
    return createMarketOrder({
      instrument: intent.instrument,
      expiry,
      size: intent.size,
      side: intent.side,
      leverage: intent.leverage,
      slippageBps: Number.isFinite(slippageBps) ? slippageBps : 10,
      deadline,
      gasLimit,
    });
  }

  return createLimitOrder({
    instrument: intent.instrument,
    expiry,
    size: intent.size,
    price: intent.price!,
    side: intent.side,
    leverage: intent.leverage,
    postOnly: false,
    deadline,
    gasLimit,
  });
}

export function isConfigured(): boolean {
  return !!process.env.MONDAY_API_KEY && !!process.env.MONDAY_API_SECRET;
}
