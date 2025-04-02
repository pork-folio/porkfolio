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
import { DynamicConnectButton } from "@/components/dynamic-connect-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Page() {
  const { primaryWallet } = useDynamicContext();
  const { balances, setBalances, isLoading, setIsLoading } = useBalanceStore();
  const { setPrices } = usePriceStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isTestnet } = useNetwork();

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
        // Don't set isLoading to true to avoid showing skeleton
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

  const strategies = core.getStrategies(isTestnet);
  console.log("Strategies", strategies);

  return (
    <>
      {!primaryWallet?.address ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="w-full max-w-md flex flex-col items-center justify-center text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Porkfolio</h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallet to manage your portfolio
              </p>
            </div>
            <DynamicConnectButton />
            <div className="w-full">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-none">
                  <AccordionTrigger className="text-left">
                    What is Porkfolio?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Porkfolio is a portfolio management platform for ZetaChain
                    that helps you track and manage your assets across different
                    chains.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-none">
                  <AccordionTrigger className="text-left">
                    How do I connect my wallet?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Click the &quot;Connect Wallet&quot; button above and select
                    your preferred wallet from the list of supported options.
                    Make sure you have a compatible wallet installed in your
                    browser.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-none">
                  <AccordionTrigger className="text-left">
                    Which networks are supported?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Porkfolio supports both ZetaChain mainnet and testnet. You
                    can switch between networks in the settings after connecting
                    your wallet.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border-none">
                  <AccordionTrigger className="text-left">
                    How do I track my portfolio?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Once connected, your portfolio will automatically display
                    all your assets across supported chains. You can refresh the
                    data using the refresh button in the top right corner.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      ) : (
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
                    {isLoading && !balances.length ? (
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
                        <BalancesTable data={balances} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      )}
    </>
  );
}
