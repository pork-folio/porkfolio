"use client";

import { AppSidebar } from "@/components/app-sidebar";
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
import { BalancesTable } from "@/components/balances-table";
import { useTransactionStore } from "@/store/transactions";
import { rebalance } from "@/core/rebalance/rebalance";
import { RebalanceDialog } from "@/components/rebalance-dialog";
import { Strategy } from "@/core";

export default function PortfolioPage() {
  const { primaryWallet } = useDynamicContext();
  const {
    balances,
    setBalances,
    isLoading: isBalancesLoading,
    setIsLoading: setBalancesLoading,
  } = useBalanceStore();
  const { prices, setPrices } = usePriceStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isRebalanceDialogOpen, setIsRebalanceDialogOpen] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<Strategy | null>(null);
  const [rebalanceOutput, setRebalanceOutput] = useState<
    | {
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
            decimals: number;
            contract?: string;
            zrc20?: string;
          };
          toPrice: {
            usdRate: number;
          };
        }[];
      }
    | undefined
  >(undefined);
  const { isTestnet } = useNetwork();
  const strategies = core.getStrategies(isTestnet);
  const allStrategies = aiStrategy ? [...strategies, aiStrategy] : strategies;

  // Add effect to check pending transactions on load
  useEffect(() => {
    const checkPendingTransactions = async () => {
      const { transactions } = useTransactionStore.getState();
      const nonCompletedTransactions = transactions.filter(
        (tx) => tx.status !== "completed" && tx.status !== "failed"
      );

      for (const tx of nonCompletedTransactions) {
        const apiUrl = isTestnet
          ? `https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${tx.hash}`
          : `https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${tx.hash}`;

        try {
          const response = await fetch(apiUrl);
          if (response.status === 404) {
            useTransactionStore
              .getState()
              .updateTransactionStatus(tx.hash, "Initiated");
          } else if (response.ok) {
            const data = await response.json();
            const cctxStatus = data.CrossChainTxs[0]?.cctx_status?.status;
            if (cctxStatus === "OutboundMined") {
              useTransactionStore
                .getState()
                .updateTransactionStatus(tx.hash, "completed");
            } else if (cctxStatus === "Aborted") {
              useTransactionStore
                .getState()
                .updateTransactionStatus(tx.hash, "failed");
            }
          }
        } catch (error) {
          console.error("Error checking transaction status:", error);
        }
      }
    };

    checkPendingTransactions();
  }, [isTestnet]);

  const refreshBalances = async () => {
    if (primaryWallet?.address) {
      setIsRefreshing(true);
      try {
        const balancesData = await fetchBalances(
          primaryWallet.address,
          isTestnet
        );
        setBalances(balancesData);

        // Check status of non-completed transactions
        const { transactions } = useTransactionStore.getState();
        const nonCompletedTransactions = transactions.filter(
          (tx) => tx.status !== "completed" && tx.status !== "failed"
        );

        for (const tx of nonCompletedTransactions) {
          const apiUrl = isTestnet
            ? `https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${tx.hash}`
            : `https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${tx.hash}`;

          try {
            const response = await fetch(apiUrl);
            if (response.status === 404) {
              useTransactionStore
                .getState()
                .updateTransactionStatus(tx.hash, "Initiated");
            } else if (response.ok) {
              const data = await response.json();
              const cctxStatus = data.CrossChainTxs[0]?.cctx_status?.status;
              if (cctxStatus === "OutboundMined") {
                useTransactionStore
                  .getState()
                  .updateTransactionStatus(tx.hash, "completed");
              } else if (cctxStatus === "Aborted") {
                useTransactionStore
                  .getState()
                  .updateTransactionStatus(tx.hash, "failed");
              }
            }
          } catch (error) {
            console.error("Error checking transaction status:", error);
          }
        }
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const loadBalances = async () => {
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

    const loadAssetPrices = async () => {
      const assets = core.supportedAssets(isTestnet);
      console.log(
        "Supported assets",
        isTestnet ? "(testnet)" : "(mainnet)",
        assets
      );

      const prices = await core.queryAssetPrices(assets);
      console.log("Prices", prices);
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

  // Separate effect for loading AI strategy
  useEffect(() => {
    const loadAiStrategy = async () => {
      if (
        primaryWallet?.address &&
        balances.length &&
        prices.length &&
        !aiStrategy
      ) {
        const supportedAssets = core.supportedAssets(isTestnet);
        const rebalanceInput = {
          portfolio: balances,
          prices,
          supportedAssets,
          strategy: strategies[0], // Use first strategy as placeholder
          allocation: { type: "percentage", percentage: 100 },
        };

        try {
          const response = await fetch("/api/ai-strategy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: primaryWallet.address,
              ...rebalanceInput,
            }),
          });

          if (response.ok) {
            const aiStrategyResult = await response.json();
            console.log("AI strategy result:", aiStrategyResult);
            setAiStrategy(aiStrategyResult.strategy);
          }
        } catch (error) {
          console.error("Error fetching AI strategy:", error);
        }
      }
    };

    loadAiStrategy();
  }, [
    primaryWallet?.address,
    balances,
    prices,
    isTestnet,
    strategies,
    aiStrategy,
  ]);

  const handleRebalance = async (
    strategy: Strategy,
    allocation: {
      type: "percentage" | "usd_value";
      percentage?: number;
      usdValue?: number;
    }
  ) => {
    if (!primaryWallet?.address || !balances.length || !prices.length) return;

    setIsRebalancing(true);
    try {
      const supportedAssets = core.supportedAssets(isTestnet);
      const rebalanceInput = {
        portfolio: balances,
        prices,
        supportedAssets,
        strategy,
        allocation,
      };

      const output = rebalance(rebalanceInput);

      if (!output.valid) {
        throw new Error("Rebalance calculation failed");
      }

      const dialogOutput = {
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
            decimals: action.to.decimals,
            contract: action.to.asset,
            zrc20: action.to.zrc20,
          },
          toPrice: {
            usdRate: action.toPrice.usdRate,
          },
        })),
      };

      setRebalanceOutput(dialogOutput);
    } catch (error) {
      console.error("Error during rebalancing:", error);
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
                    <h1 className="text-3xl font-bold">Portfolio</h1>
                    <p className="text-muted-foreground mt-2">
                      Manage your portfolio positions here.
                    </p>
                  </div>
                  <div className="flex gap-2">
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
              </div>
              <div className="px-4 lg:px-6">
                {isBalancesLoading && !balances.length ? (
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
                    <BalancesTable
                      data={balances}
                      onRebalance={() => setIsRebalanceDialogOpen(true)}
                      isRebalancing={isRebalancing}
                    />
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
        strategies={allStrategies}
        onRebalance={handleRebalance}
        isRebalancing={isRebalancing}
        rebalanceOutput={rebalanceOutput}
      />
    </SidebarProvider>
  );
}
