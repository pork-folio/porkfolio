import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SwapAction, executeRebalancingSwap } from "@/lib/handlers/rebalancing";
import { useTransactionStore } from "@/store/transactions";
import { Badge } from "@/components/ui/badge";
import { CryptoIcon } from "@/components/ui/crypto-icon";

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
  const { primaryWallet } = useDynamicContext();
  const transactions = useTransactionStore((state) => state.transactions);

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

  return (
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
            } transition-colors ${isLoading ? "opacity-50" : ""} ${
              status === "completed" ? "opacity-50 pointer-events-none" : ""
            }`}
            onClick={() =>
              !isLoading &&
              !readOnly &&
              status !== "completed" &&
              handleSwap(action, index)
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    Swap {action.from.symbol}
                    <CryptoIcon symbol={action.from.symbol} size={16} className="ml-1 pb-0.5" />
                    {" → "}
                    {action.to.symbol}
                    <CryptoIcon symbol={action.to.symbol} size={16} className="ml-1 pb-0.5" />
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
                  From: {action.fromTokenValue.toFixed(6)} {action.from.symbol}{" "}
                  on {action.from.chain_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  To: {(action.fromUsdValue / action.toPrice.usdRate).toFixed(6)} {action.to.symbol} on ZetaChain
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
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
  );
}
