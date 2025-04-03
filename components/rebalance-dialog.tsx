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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Strategy } from "@/core";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRebalancingStore } from "@/store/rebalancing";
import { RebalancingActions } from "@/components/rebalancing-actions";

interface RebalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategies: Strategy[];
  onRebalance: (strategy: Strategy, allocation: number) => void;
  isRebalancing: boolean;
  rebalanceOutput?: {
    valid: boolean;
    actions: {
      type: string;
      from: {
        symbol: string;
        balance: string;
        chain_name: string;
      };
      fromUsdValue: number;
      fromTokenValue: number;
      to: {
        symbol: string;
        name: string;
      };
      toPrice: {
        usdRate: number;
      };
    }[];
  };
}

export function RebalanceDialog({
  open,
  onOpenChange,
  strategies,
  onRebalance,
  isRebalancing,
  rebalanceOutput,
}: RebalanceDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );
  const [allocation, setAllocation] = useState("100");
  const [showActions, setShowActions] = useState(false);
  const addOperation = useRebalancingStore((state) => state.addOperation);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShowActions(false);
      setSelectedStrategy(null);
      setAllocation("100");
    }
  }, [open]);

  const handleAllocationChange = (value: string | number[]) => {
    if (typeof value === "string") {
      setAllocation(value);
    } else {
      setAllocation(value[0].toString());
    }
  };

  const handleRebalanceClick = () => {
    if (selectedStrategy) {
      setShowActions(true);
      onRebalance(selectedStrategy, Number(allocation));
    }
  };

  const handleSave = () => {
    if (selectedStrategy && rebalanceOutput) {
      addOperation({
        strategy: selectedStrategy,
        allocation: Number(allocation),
        actions: rebalanceOutput.actions,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rebalance Portfolio</DialogTitle>
          <DialogDescription>
            {showActions
              ? "Review the actions that will be performed to rebalance your portfolio."
              : "Select a strategy and allocation percentage to rebalance your portfolio."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {!showActions ? (
            <>
              <div className="grid gap-4 py-4">
                <div className="flex gap-4">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className={cn(
                        "relative flex cursor-pointer flex-col rounded-lg border p-4 transition-colors hover:bg-accent flex-1",
                        selectedStrategy?.id === strategy.id &&
                          "border-primary bg-accent"
                      )}
                      onClick={() => setSelectedStrategy(strategy)}
                    >
                      <h3 className="font-semibold">{strategy.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {strategy.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {strategy.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="allocation">Allocation Percentage</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[Number(allocation)]}
                      onValueChange={handleAllocationChange}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        id="allocation"
                        type="number"
                        min="1"
                        max="100"
                        value={allocation}
                        onChange={(e) => handleAllocationChange(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <RebalancingActions actions={rebalanceOutput?.actions || []} />
          )}
        </div>
        <DialogFooter className="mt-4">
          {!showActions ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isRebalancing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRebalanceClick}
                disabled={!selectedStrategy || isRebalancing}
              >
                {isRebalancing ? "Rebalancing..." : "Rebalance"}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!rebalanceOutput || isRebalancing}
            >
              Save Rebalancing
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
