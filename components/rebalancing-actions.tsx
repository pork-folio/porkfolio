import { useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SwapAction, executeRebalancingSwap } from "@/lib/handlers/rebalancing";

interface RebalancingActionsProps {
  actions: SwapAction[];
  readOnly?: boolean;
}

export function RebalancingActions({
  actions,
  readOnly = false,
}: RebalancingActionsProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const { primaryWallet } = useDynamicContext();

  const handleSwap = async (action: SwapAction) => {
    if (readOnly) return;

    try {
      const actionKey = `${action.from.symbol}-${action.to.symbol}`;
      setLoadingStates((prev) => ({ ...prev, [actionKey]: true }));

      await executeRebalancingSwap(action, primaryWallet);
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

  return (
    <div>
      <div className="space-y-4">
        {actions.map((action, index) => {
          const actionKey = `${action.from.symbol}-${action.to.symbol}`;
          const isLoading = loadingStates[actionKey];

          return (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                readOnly ? "" : "cursor-pointer hover:bg-gray-50"
              } transition-colors ${isLoading ? "opacity-50" : ""}`}
              onClick={() => !isLoading && !readOnly && handleSwap(action)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Swap {action.fromTokenValue.toFixed(6)} {action.from.symbol}{" "}
                    for {action.to.symbol}
                  </h3>
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
