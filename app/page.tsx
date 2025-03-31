"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      if (primaryWallet?.address) {
        setIsLoading(true);
        try {
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
        } finally {
          setIsLoading(false);
        }
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
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                    <div className="space-y-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2"
                        >
                          <div className="flex items-center space-x-4">
                            <Skeleton className="h-8 w-8" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-[120px]" />
                              <Skeleton className="h-3 w-[80px]" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-[80px]" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <DataTable data={balances} />
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
