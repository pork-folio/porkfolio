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

interface RebalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategies: Strategy[];
  onRebalance: (strategy: Strategy, allocation: number) => void;
  isRebalancing: boolean;
}

export function RebalanceDialog({
  open,
  onOpenChange,
  strategies,
  onRebalance,
  isRebalancing,
}: RebalanceDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );
  const [allocation, setAllocation] = useState("100");
  const [showActions, setShowActions] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Rebalance Portfolio</DialogTitle>
          <DialogDescription>
            {showActions
              ? "Review the actions that will be performed to rebalance your portfolio."
              : "Select a strategy and allocation percentage to rebalance your portfolio."}
          </DialogDescription>
        </DialogHeader>
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
            <DialogFooter>
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
            </DialogFooter>
          </>
        ) : (
          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Rebalance Actions</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span>Calculating current portfolio allocation...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span>Determining required trades...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span>Preparing order execution...</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isRebalancing}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
