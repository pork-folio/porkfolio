"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBalances } from "@/lib/handlers/balances";
import { useBalanceStore } from "@/store/balances";
import { usePriceStore } from "@/store/prices";
import { Button } from "@/components/ui/button";
import { IconRefresh } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import * as core from "@/core";
import { useNetwork } from "@/components/providers";

export default function Page() {
  const { primaryWallet } = useDynamicContext();
  const { balances, setBalances, isLoading, setIsLoading } = useBalanceStore();
  const { setPrices } = usePriceStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isTestnet } = useNetwork();

  const refreshBalances = async () => {
    if (primaryWallet?.address) {
      setIsRefreshing(true);
      try {
        const balancesData = await fetchBalances(
          primaryWallet.address,
          isTestnet
        );
        setBalances(balancesData);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const loadBalances = async () => {
      if (primaryWallet?.address) {
        setIsLoading(true);
        try {
          const balancesData = await fetchBalances(
            primaryWallet.address,
            isTestnet
          );
          setBalances(balancesData);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const loadAssetPrices = async () => {
      // Always use mainnet prices regardless of network setting
      const assets = core.supportedAssets(false);
      console.log("Supported assets (mainnet)", assets);

      const prices = await core.queryAssetPrices(assets);
      console.log("Prices", prices);
      setPrices(prices);
    };

    loadBalances();
    loadAssetPrices();
  }, [primaryWallet?.address, setBalances, setIsLoading, setPrices, isTestnet]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Portfolio</h1>
                    <p className="text-muted-foreground mt-2">
                      Manage your portfolio positions here.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshBalances}
                    disabled={isRefreshing || !primaryWallet?.address}
                  >
                    <IconRefresh
                      className={cn(
                        "mr-2 h-4 w-4",
                        isRefreshing && "animate-spin"
                      )}
                    />
                    Refresh
                  </Button>
                </div>
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
                  <div
                    className={cn(
                      "transition-opacity duration-200",
                      isRefreshing && "opacity-50"
                    )}
                  >
                    <DataTable data={balances} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
