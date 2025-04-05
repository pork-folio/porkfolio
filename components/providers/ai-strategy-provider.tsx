"use client";

import { useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAiStrategyStore } from "@/store/ai-strategy";
import { useBalanceStore } from "@/store/balances";
import { usePriceStore } from "@/store/prices";
import { useNetwork } from "@/components/providers";
import * as core from "@/core";

export function AiStrategyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { primaryWallet } = useDynamicContext();
  const { balances } = useBalanceStore();
  const { prices } = usePriceStore();
  const { isTestnet } = useNetwork();
  const { strategy, setStrategy, setLoading, setError, refreshTrigger } =
    useAiStrategyStore();

  useEffect(() => {
    const loadAiStrategy = async () => {
      if (
        primaryWallet?.address &&
        balances.length &&
        prices.length &&
        (!strategy || useAiStrategyStore.getState().isLoading)
      ) {
        setLoading(true);
        setError(null);

        try {
          const supportedAssets = core.supportedAssets(isTestnet);
          const rebalanceInput = {
            portfolio: balances,
            prices,
            supportedAssets,
            strategy: core.getStrategies(isTestnet)[0], // Use first strategy as placeholder
            allocation: { type: "percentage", percentage: 100 },
          };

          const response = await fetch("/api/ai-strategy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: primaryWallet.address,
              ...rebalanceInput,
            }),
          });

          if (response.ok) {
            const { strategy } = await response.json();
            setStrategy(strategy);
          } else {
            throw new Error("Failed to load AI strategy");
          }
        } catch (error) {
          console.error("Error loading AI strategy:", error);
          setError(error instanceof Error ? error.message : "Unknown error");
          setLoading(false);
        }
      }
    };

    loadAiStrategy();
  }, [
    primaryWallet?.address,
    balances,
    prices,
    isTestnet,
    strategy,
    setStrategy,
    setLoading,
    setError,
    refreshTrigger,
  ]);

  return <>{children}</>;
}
