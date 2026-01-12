import CryptoJS from "crypto-js";

const API_KEY = process.env.MONDAY_API_KEY || "";
const SECRET_KEY = process.env.MONDAY_SECRET_KEY || "";
const PASSPHRASE = process.env.MONDAY_PASSPHRASE || "";
const API_URL = process.env.MONDAY_API_URL || "https://api.monday.trade/v4/public/mm";

function generateSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string = ""
): string {
  const message = timestamp + method + path + body;
  const signature = CryptoJS.HmacSHA256(message, SECRET_KEY);
  return CryptoJS.enc.Base64.stringify(signature);
}

async function makeRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyString = body ? JSON.stringify(body) : "";
  const signature = generateSignature(timestamp, method, path, bodyString);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "MC-ACCESS-KEY": API_KEY,
    "MC-ACCESS-SIGN": signature,
    "MC-ACCESS-TIMESTAMP": timestamp,
    "MC-ACCESS-PASSPHRASE": PASSPHRASE,
  };

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: bodyString || undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Monday API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Monday API request failed:", error);
    throw error;
  }
}

export interface MarketData {
  pair: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
}

export interface OrderBook {
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
}

export async function getMarketData(): Promise<MarketData[]> {
  try {
    const data = await makeRequest<{ data: MarketData[] }>("GET", "/markets");
    return data.data || [];
  } catch (error) {
    console.error("Failed to get market data:", error);
    return [
      { pair: "BTC/USDC", price: 0, change24h: 0, volume24h: 0, fundingRate: 0 },
      { pair: "ETH/USDC", price: 0, change24h: 0, volume24h: 0, fundingRate: 0 },
      { pair: "MON/USDC", price: 0, change24h: 0, volume24h: 0, fundingRate: 0 },
    ];
  }
}

export async function getOrderBook(pair: string): Promise<OrderBook> {
  try {
    const data = await makeRequest<{ data: OrderBook }>("GET", `/orderbook/${pair}`);
    return data.data || { bids: [], asks: [] };
  } catch (error) {
    console.error("Failed to get order book:", error);
    return { bids: [], asks: [] };
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await makeRequest("GET", "/health");
    return true;
  } catch {
    return false;
  }
}

export function isConfigured(): boolean {
  return !!(API_KEY && SECRET_KEY && PASSPHRASE);
}
