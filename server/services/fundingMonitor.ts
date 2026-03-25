import { fetchFundingRateHistory, isConfigured } from "./mondayApi";

export interface FundingStatus {
  configured: boolean;
  available: boolean;
  symbol: string;
  currentRate: number | null;
  annualizedRate: number | null;
  favorable: boolean;
  direction: "positive" | "negative" | "neutral" | null;
  lastUpdated: string | null;
  fundingInterval: number;
  message: string;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const FUNDING_INTERVAL_HOURS = 24;
const PERIODS_PER_YEAR = (365 * 24) / FUNDING_INTERVAL_HOURS;

let currentStatus: FundingStatus = {
  configured: false,
  available: false,
  symbol: "MON/USDC",
  currentRate: null,
  annualizedRate: null,
  favorable: false,
  direction: null,
  lastUpdated: null,
  fundingInterval: FUNDING_INTERVAL_HOURS,
  message: "Funding rate monitor not configured. Add MONDAY_API_KEY and MONDAY_API_SECRET to enable.",
};

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function fetchAndUpdate(): Promise<void> {
  if (!isConfigured()) {
    currentStatus = {
      ...currentStatus,
      configured: false,
      available: false,
      message: "Funding rate monitor not configured. Add MONDAY_API_KEY and MONDAY_API_SECRET to enable.",
    };
    return;
  }

  currentStatus.configured = true;

  try {
    const history = await fetchFundingRateHistory("MON/USDC");

    if (!history || history.length === 0) {
      currentStatus = {
        ...currentStatus,
        available: false,
        message: "No funding rate data available from Monday Trade API.",
      };
      return;
    }

    const latest = history[history.length - 1];
    const rate = parseFloat(latest.fundingRate);

    if (isNaN(rate)) {
      console.error("[FUNDING] Invalid funding rate value:", latest.fundingRate);
      currentStatus = {
        ...currentStatus,
        available: false,
        message: "Received invalid funding rate data from Monday Trade API.",
      };
      return;
    }

    const annualized = rate * PERIODS_PER_YEAR * 100;
    const favorable = rate > 0;
    const direction: FundingStatus["direction"] = rate > 0 ? "positive" : rate < 0 ? "negative" : "neutral";

    currentStatus = {
      configured: true,
      available: true,
      symbol: "MON/USDC",
      currentRate: rate,
      annualizedRate: Math.round(annualized * 100) / 100,
      favorable,
      direction,
      lastUpdated: new Date().toISOString(),
      fundingInterval: latest.fundingInterval || FUNDING_INTERVAL_HOURS,
      message: favorable
        ? `Funding rate is positive (${(rate * 100).toFixed(4)}%). Delta neutral strategy is favorable — shorts are earning funding fees.`
        : rate < 0
          ? `Funding rate is negative (${(rate * 100).toFixed(4)}%). Delta neutral strategy is not favorable — shorts are paying funding fees.`
          : "Funding rate is neutral (0%). No funding fee advantage for delta neutral strategy.",
    };

    console.log(`[FUNDING] Updated: rate=${(rate * 100).toFixed(4)}% APR=${annualized.toFixed(2)}% favorable=${favorable}`);
  } catch (error) {
    console.error("[FUNDING] Update error:", error);
    currentStatus = {
      ...currentStatus,
      available: false,
      message: "Failed to fetch funding rate data.",
    };
  }
}

export function startFundingMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
  }

  console.log("[FUNDING] Starting funding rate monitor");
  fetchAndUpdate();
  pollTimer = setInterval(fetchAndUpdate, POLL_INTERVAL_MS);
}

export function stopFundingMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[FUNDING] Stopped funding rate monitor");
  }
}

export function getFundingStatus(): FundingStatus {
  return { ...currentStatus };
}

export function getFundingContextForChat(): string | null {
  if (!currentStatus.available || currentStatus.currentRate === null) {
    return null;
  }

  const ratePercent = (currentStatus.currentRate * 100).toFixed(4);
  const apr = currentStatus.annualizedRate?.toFixed(2) || "N/A";

  return `LIVE FUNDING RATE DATA (MON/USDC Perpetual):
- Current Funding Rate: ${ratePercent}%
- Annualized Rate: ${apr}%
- Direction: ${currentStatus.direction} (${currentStatus.favorable ? "longs pay shorts" : "shorts pay longs"})
- Favorable for Delta Neutral: ${currentStatus.favorable ? "YES" : "NO"}
- Funding Interval: ${currentStatus.fundingInterval} hours
- Last Updated: ${currentStatus.lastUpdated}

Delta Neutral Strategy Summary:
- Buy MON on Spot + Short MON on Perp at 1x leverage = zero price exposure
- When funding rate is positive, shorts earn funding fees from longs
- Projected Annual Yield: ${apr}% (based on current rate, subject to change)`;
}
