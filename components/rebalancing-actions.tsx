import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SwapAction, executeRebalancingSwap } from "@/lib/handlers/rebalancing";
import { useTransactionStore } from "@/store/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconRefresh } from "@tabler/icons-react";
import { useNetwork } from "@/components/providers";
import { Progress } from "@/components/ui/progress";

// Add keyframes for rotation animation
const refreshAnimation = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

interface RebalancingActionsProps {
  actions: SwapAction[];
  readOnly?: boolean;
  rebalancingId: string;
}

export function RebalancingActions({
  actions,
  readOnly = false,
  rebalancingId,
}: RebalancingActionsProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { primaryWallet } = useDynamicContext();
  const transactions = useTransactionStore((state) => state.transactions);
  const updateTransactionStatus = useTransactionStore(
    (state) => state.updateTransactionStatus
  );
  const { isTestnet } = useNetwork();

  const handleSwap = async (action: SwapAction, index: number) => {
    if (readOnly) return;

    try {
      const actionKey = `${action.from.symbol}-${action.to.symbol}`;
      setLoadingStates((prev) => ({ ...prev, [actionKey]: true }));

      await executeRebalancingSwap(action, primaryWallet, rebalancingId, index);
    } catch (error) {
      console.error("Swap failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Swap failed. Please try again."
      );
    } finally {
      const actionKey = `${action.from.symbol}-${action.to.symbol}`;
      setLoadingStates((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const findTransactionStatus = (action: SwapAction) => {
    const matchingTransaction = transactions.find(
      (tx) =>
        tx.rebalancingGroupId === rebalancingId &&
        tx.targetToken?.symbol === action.to.symbol &&
        tx.amount === action.fromTokenValue.toString()
    );
    return matchingTransaction?.status;
  };

  const calculateProgress = () => {
    const completedActions = actions.filter(
      (action) => findTransactionStatus(action) === "completed"
    ).length;
    return (completedActions / actions.length) * 100;
  };

  const refreshAllStatuses = async () => {
    setIsRefreshing(true);
    const startTime = Date.now();

    try {
      const rebalancingTransactions = transactions.filter(
        (tx) => tx.rebalancingGroupId === rebalancingId
      );

      await Promise.all(
        rebalancingTransactions.map(async (tx) => {
          try {
            const apiUrl = isTestnet
              ? `https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${tx.hash}`
              : `https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${tx.hash}`;

            const response = await fetch(apiUrl);

            if (response.status === 404) {
              updateTransactionStatus(tx.hash, "Initiated");
            } else if (response.ok) {
              const data = await response.json();
              const cctxStatus = data.CrossChainTxs[0]?.cctx_status?.status;
              if (cctxStatus === "OutboundMined") {
                updateTransactionStatus(tx.hash, "completed");
              } else if (cctxStatus === "Aborted") {
                updateTransactionStatus(tx.hash, "failed");
              }
            }
          } catch (error) {
            console.error(
              `Error checking status for transaction ${tx.hash}:`,
              error
            );
          }
        })
      );
    } catch (error) {
      console.error("Error refreshing statuses:", error);
    } finally {
      // Ensure the animation runs for at least 1 second
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsedTime));
      }
      setIsRefreshing(false);
    }
  };

  const progress = calculateProgress();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium">Overall Progress</h3>
            <Badge variant="outline">{Math.round(progress)}%</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAllStatuses}
          disabled={isRefreshing}
        >
          <style>{refreshAnimation}</style>
          <IconRefresh
            className={`mr-2 h-4 w-4 ${
              isRefreshing ? "animate-[spin_1s_linear_infinite]" : ""
            }`}
          />
          Refresh Statuses
        </Button>
      </div>
      <div className="space-y-4">
        {actions.map((action, index) => {
          const actionKey = `${action.from.symbol}-${action.to.symbol}`;
          const isLoading = loadingStates[actionKey];
          const status = findTransactionStatus(action);

          return (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                readOnly ? "" : "cursor-pointer hover:bg-gray-50"
              } transition-colors ${isLoading ? "opacity-50" : ""}`}
              onClick={() =>
                !isLoading && !readOnly && handleSwap(action, index)
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      Swap {action.fromTokenValue.toFixed(6)}{" "}
                      {action.from.symbol} for {action.to.symbol}
                    </h3>
                    {status && (
                      <Badge
                        variant={
                          status === "completed"
                            ? "default"
                            : status === "pending" || status === "Initiated"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From: {action.fromTokenValue.toFixed(6)}{" "}
                    {action.from.symbol} on {action.from.chain_name} ($
                    {action.fromUsdValue.toFixed(2)})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    To: {action.to.symbol} on ZetaChain ($
                    {(action.fromUsdValue / action.toPrice.usdRate).toFixed(6)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    ${action.fromUsdValue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">USD Value</p>
                  {isLoading && (
                    <p className="text-xs text-blue-500 mt-1">Processing...</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
