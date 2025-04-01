import { ZetaChainClient } from "@zetachain/toolkit/client";

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

const roundNumber = (value: number): string => {
  let roundedValue: number;
  if (value >= 1) {
    roundedValue = parseFloat(value.toFixed(1));
  } else {
    roundedValue = roundToSignificantDigits(value, 2);
  }

  return roundedValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 20,
    useGrouping: false,
  });
};

export interface BalanceData {
  chain_id: string;
  coin_type: string;
  contract: string;
  decimals: number;
  symbol: string;
  zrc20?: string;
  chain_name: string;
  id: string;
  ticker: string;
  balance: string;
}

export async function fetchBalances(address: string): Promise<BalanceData[]> {
  const client = new ZetaChainClient({ network: "testnet" });

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
    balance: roundNumber(parseFloat(balance.balance)),
  }));
}
