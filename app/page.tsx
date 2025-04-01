"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BalanceData, fetchBalances } from "@/lib/handlers/balances";

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

export default function Page() {
  const { primaryWallet } = useDynamicContext();
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBalances = async () => {
      if (primaryWallet?.address) {
        setIsLoading(true);
        try {
          const balancesData = await fetchBalances(primaryWallet.address);
          setBalances(balancesData);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadBalances();
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
