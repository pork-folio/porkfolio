"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";

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

interface BalanceData {
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

export default function Page() {
  const { primaryWallet } = useDynamicContext();
  const client = new ZetaChainClient({ network: "testnet" });
  const [balances, setBalances] = useState<BalanceData[]>([]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (primaryWallet?.address) {
        const balancesData = await client.getBalances({
          evmAddress: primaryWallet.address,
        });

        // Transform the balances data to match the expected format
        const transformedBalances = balancesData.map((balance) => ({
          ...balance,
          chain_id: String(balance.chain_id || ""),
          contract: balance.contract || "",
          chain_name: balance.chain_name || "",
          ticker: balance.ticker || balance.symbol,
          balance: roundNumber(parseFloat(balance.balance)),
        }));

        setBalances(transformedBalances);
      }
    };

    fetchBalances();
  }, [primaryWallet?.address]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-3xl font-bold">Portfolio</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your portfolio positions here.
                </p>
              </div>
              <div className="px-4 lg:px-6">
                <DataTable data={balances} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
