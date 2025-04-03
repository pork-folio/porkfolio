"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRebalancingStore, RebalancingOperation } from "@/store/rebalancing";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconScale, IconTrash } from "@tabler/icons-react";
import { RebalanceDialog } from "@/components/rebalance-dialog";
import { RebalancingDetailsDialog } from "@/components/rebalancing-details-dialog";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useBalanceStore } from "@/store/balances";
import { usePriceStore } from "@/store/prices";
import { useNetwork } from "@/components/providers";
import * as core from "@/core";
import { useState, useEffect } from "react";
import { rebalance } from "@/core/rebalance/rebalance";
import { Strategy } from "@/core";
import { fetchBalances } from "@/lib/handlers/balances";
import { useRouter } from "next/navigation";

type RebalanceDialogOutput = {
  valid: boolean;
  actions: {
    type: string;
    from: {
      symbol: string;
      balance: string;
      chain_name: string;
      chain_id: string;
      coin_type: string;
      decimals: number;
      contract?: string;
      zrc20?: string;
    };
    fromUsdValue: number;
    fromTokenValue: number;
    to: {
      symbol: string;
      name: string;
      chain_id: string;
      coin_type: string;
      coinType: string;
      decimals: number;
      contract?: string;
      zrc20?: string;
      chain_name: string;
      balance: string;
    };
    toPrice: {
      usdRate: number;
    };
  }[];
};

export default function RebalancingPage() {
  const router = useRouter();
  const operations = useRebalancingStore((state) => state.operations);
  const deleteOperation = useRebalancingStore((state) => state.deleteOperation);
  const addOperation = useRebalancingStore((state) => state.addOperation);
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
  const [rebalanceOutput, setRebalanceOutput] = useState<
    RebalanceDialogOutput | undefined
  >(undefined);

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
    console.log("handleRebalance called with:", { strategy, allocation });
    console.log("Current state:", {
      hasWallet: !!primaryWallet?.address,
      balancesLength: balances.length,
      pricesLength: prices.length,
    });

    if (!primaryWallet?.address || !balances.length || !prices.length) {
      console.log("Early return due to missing data");
      return;
    }

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

      console.log("Rebalance input:", {
        portfolio: balances,
        prices,
        supportedAssets,
        strategy,
        allocation,
      });

      const output = rebalance(rebalanceInput);
      console.log("Rebalance output:", output);

      if (!output.valid) {
        throw new Error("Rebalance calculation failed");
      }

      // Transform the core output to match the dialog's expected shape
      const dialogOutput: RebalanceDialogOutput = {
        valid: output.valid,
        actions: output.actions.map((action) => ({
          type: action.type,
          from: {
            symbol: action.from.symbol,
            balance: action.from.balance,
            chain_name: action.from.chain_name,
            chain_id: action.from.chain_id,
            coin_type: action.from.coin_type,
            decimals: action.from.decimals,
            contract: action.from.contract,
            zrc20: action.from.zrc20,
          },
          fromUsdValue: action.fromUsdValue,
          fromTokenValue: action.fromTokenValue,
          to: {
            symbol: action.to.symbol,
            name: action.to.name,
            chain_id: action.to.chainId,
            coin_type: action.to.coinType,
            coinType: action.to.coinType,
            decimals: action.to.decimals,
            contract: action.to.asset,
            zrc20: action.to.zrc20,
            chain_name: "ZetaChain",
            balance: "0",
          },
          toPrice: {
            usdRate: action.toPrice.usdRate,
          },
        })),
      };

      setRebalanceOutput(dialogOutput);

      // Add operation to store with the transformed actions
      addOperation({
        strategy,
        allocation,
        actions: dialogOutput.actions,
      });
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
                      <div
                        key={operation.id}
                        className="rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() =>
                          router.push(`/rebalancing/${operation.id}`)
                        }
                      >
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
                          <div className="flex items-center gap-2">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOperation(operation.id);
                              }}
                              className="h-8 w-8"
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
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
