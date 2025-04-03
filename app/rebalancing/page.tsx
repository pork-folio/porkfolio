"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRebalancingStore } from "@/store/rebalancing";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconScale } from "@tabler/icons-react";
import { RebalanceDialog } from "@/components/rebalance-dialog";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useBalanceStore } from "@/store/balances";
import { usePriceStore } from "@/store/prices";
import { useNetwork } from "@/components/providers";
import * as core from "@/core";
import { useState, useEffect } from "react";
import { rebalance } from "@/core/rebalance/rebalance";
import { Strategy } from "@/core";
import { fetchBalances } from "@/lib/handlers/balances";

export default function RebalancingPage() {
  const operations = useRebalancingStore((state) => state.operations);
  const { primaryWallet } = useDynamicContext();
  const {
    balances,
    setBalances,
    setIsLoading: setBalancesLoading,
  } = useBalanceStore();
  const { prices, setPrices } = usePriceStore();
  const { isTestnet } = useNetwork();
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isRebalanceDialogOpen, setIsRebalanceDialogOpen] = useState(false);
  const [rebalanceOutput, setRebalanceOutput] = useState<any>(null);

  const strategies = core.getStrategies(isTestnet);

  // Load balances and prices on mount
  useEffect(() => {
    const loadBalances = async () => {
      if (primaryWallet?.address) {
        setBalancesLoading(true);
        try {
          const balancesData = await fetchBalances(
            primaryWallet.address,
            isTestnet
          );
          setBalances(balancesData);
        } finally {
          setBalancesLoading(false);
        }
      }
    };

    const loadAssetPrices = async () => {
      const assets = core.supportedAssets(isTestnet);
      const prices = await core.queryAssetPrices(assets);
      setPrices(prices);
    };

    loadBalances();
    loadAssetPrices();
  }, [
    primaryWallet?.address,
    setBalances,
    setBalancesLoading,
    setPrices,
    isTestnet,
  ]);

  const handleRebalance = async (strategy: Strategy, allocation: number) => {
    if (!primaryWallet?.address || !balances.length || !prices.length) return;

    setIsRebalancing(true);
    try {
      const supportedAssets = core.supportedAssets(isTestnet);
      const rebalanceInput = {
        portfolio: balances,
        prices,
        supportedAssets,
        strategy,
        allocation: {
          type: "percentage" as const,
          percentage: allocation,
        },
      };

      const output = rebalance(rebalanceInput);
      console.log("Rebalance output:", output);

      if (!output.valid) {
        throw new Error("Rebalance calculation failed");
      }

      setRebalanceOutput(output);
    } catch (error) {
      console.error("Error during rebalancing:", error);
      // You might want to show an error toast here
    } finally {
      setIsRebalancing(false);
    }
  };

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
                    <h1 className="text-3xl font-bold">Rebalancing</h1>
                    <p className="text-muted-foreground mt-2">
                      View and manage your portfolio rebalancing operations.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRebalanceDialogOpen(true)}
                    disabled={
                      !primaryWallet?.address ||
                      !balances.length ||
                      !prices.length
                    }
                  >
                    <IconScale className="mr-2 h-4 w-4" />
                    Rebalance
                  </Button>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                {operations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">
                      No rebalancing operations yet. Start by creating a new one
                      from the portfolio page.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {operations.map((operation) => (
                      <div key={operation.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {operation.strategy.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {operation.allocation}% allocation •{" "}
                              {formatDistanceToNow(operation.createdAt, {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <Badge
                            variant={
                              operation.status === "completed"
                                ? "default"
                                : operation.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {operation.status}
                          </Badge>
                        </div>
                        <div className="mt-4 space-y-2">
                          {operation.actions.map((action, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>
                                Swap {action.from.balance} {action.from.symbol}{" "}
                                for {action.to.symbol}
                              </span>
                              <span className="text-muted-foreground">
                                ${action.fromUsdValue.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <RebalanceDialog
        open={isRebalanceDialogOpen}
        onOpenChange={setIsRebalanceDialogOpen}
        strategies={strategies}
        onRebalance={handleRebalance}
        isRebalancing={isRebalancing}
        rebalanceOutput={rebalanceOutput}
      />
    </SidebarProvider>
  );
}
