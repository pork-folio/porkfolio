import { RebalancingOperation } from "@/store/rebalancing";

interface RebalancingActionsProps {
  actions: RebalancingOperation["actions"];
}

export function RebalancingActions({ actions }: RebalancingActionsProps) {
  return (
    <div className="py-4">
      <div className="space-y-4">
        {actions.map((action, index) => (
          <div key={index} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  Swap {action.from.balance} {action.from.symbol} for{" "}
                  {action.to.symbol}
                </h3>
                <p className="text-sm text-muted-foreground">
                  From: {action.from.balance} {action.from.symbol} ($
                  {action.fromUsdValue.toFixed(2)})
                </p>
                <p className="text-sm text-muted-foreground">
                  To: {action.to.symbol} ($
                  {(action.fromUsdValue / action.toPrice.usdRate).toFixed(6)})
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  ${action.fromUsdValue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">USD Value</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
