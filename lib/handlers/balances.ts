import { ZetaChainClient } from "@zetachain/toolkit/client";
import { usePriceStore } from "@/store/prices";

const roundToSignificantDigits = (
  value: number,
  significantDigits: number
): number => {
  if (value === 0) return 0;
  const digits =
    -Math.floor(Math.log10(Math.abs(value))) + (significantDigits - 1);
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const roundNumber = (value: number, ticker: string): string => {
  const { prices } = usePriceStore.getState();
  const price = prices.find((p) => p.ticker === ticker)?.usdRate;

  // If no price is found, use default precision of 2
  const pricePrecision = price
    ? Math.max(2, -Math.floor(Math.log10(Math.abs(price))) + 1)
    : 2;
  const balancePrecision = pricePrecision + 1;

  let roundedValue: number;
  if (value >= 1) {
    roundedValue = parseFloat(value.toFixed(balancePrecision));
  } else {
    roundedValue = roundToSignificantDigits(value, balancePrecision);
  }

  return roundedValue.toLocaleString("en-US", {
    minimumFractionDigits: balancePrecision,
    maximumFractionDigits: 20,
    useGrouping: false,
  });
};

export interface BalanceData {
  chain_id: string;
  coin_type: "ZRC20" | "ERC20" | "Gas";
  contract: string;
  decimals: number;
  symbol: string;
  zrc20?: string;
  chain_name: string;
  id: string;
  ticker: string;
  balance: string;
}

export async function fetchBalances(
  address: string,
  isTestnet: boolean = true
): Promise<BalanceData[]> {
  const client = new ZetaChainClient({
    network: isTestnet ? "testnet" : "mainnet",
  });

  const balancesData = await client.getBalances({
    evmAddress: address,
  });

  // Transform the balances data to match the expected format
  return balancesData.map((balance) => ({
    ...balance,
    chain_id: String(balance.chain_id || ""),
    contract: balance.contract || "",
    chain_name: balance.chain_name || "",
    ticker: balance.ticker || balance.symbol,
    balance: roundNumber(
      parseFloat(balance.balance),
      balance.ticker || balance.symbol
    ),
    coin_type: balance.coin_type as "ZRC20" | "ERC20" | "Gas",
  }));
}
