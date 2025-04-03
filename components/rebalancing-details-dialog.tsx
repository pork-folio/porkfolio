"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RebalancingOperation } from "@/store/rebalancing";

interface RebalancingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: RebalancingOperation;
}

export function RebalancingDetailsDialog({
  open,
  onOpenChange,
  operation,
}: RebalancingDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{operation.strategy.name}</DialogTitle>
          <DialogDescription>
            Review the actions that will be performed to rebalance your
            portfolio.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="py-4">
            <div className="space-y-4">
              {operation.actions.map((action, index) => (
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
                        {(action.fromUsdValue / action.toPrice.usdRate).toFixed(
                          6
                        )}
                        )
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
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
