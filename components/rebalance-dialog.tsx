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
import { useState, useEffect, useMemo } from "react";
import { useRebalancingStore } from "@/store/rebalancing";
import { RebalancingActions } from "@/components/rebalancing-actions";
import { SwapAction } from "@/lib/handlers/rebalancing";
import { useRouter } from "next/navigation";
import { useBalanceStore } from "@/store/balances";
import { usePriceStore } from "@/store/prices";
import confetti from "canvas-confetti";

interface RebalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategies: Strategy[];
  onRebalance: (
    strategy: Strategy,
    allocation: {
      type: "percentage" | "usd_value";
      percentage?: number;
      usdValue?: number;
    }
  ) => void;
  isRebalancing: boolean;
  rebalanceOutput?: {
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
  const [allocationType, setAllocationType] = useState<
    "percentage" | "usd_value"
  >("percentage");
  const [allocation, setAllocation] = useState("2");
  const [lastCalculation, setLastCalculation] = useState<{
    strategyId: string;
    allocation: {
      type: "percentage" | "usd_value";
      percentage?: number;
      usdValue?: number;
    };
  } | null>(null);
  const addOperation = useRebalancingStore((state) => state.addOperation);
  const router = useRouter();
  const { balances } = useBalanceStore();
  const { prices } = usePriceStore();

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return balances.reduce((total, token) => {
      const price = prices.find((p) => p.ticker === token.symbol)?.usdRate;
      const balance = parseFloat(token.balance);
      if (price && balance > 0) {
        return total + price * balance;
      }
      return total;
    }, 0);
  }, [balances, prices]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStrategy(null);
      setAllocation("2");
      setAllocationType("percentage");
      setLastCalculation(null);
    }
  }, [open]);

  // Auto-calculate rebalancing when strategy or allocation changes
  useEffect(() => {
    if (selectedStrategy && !isRebalancing) {
      const currentCalculation = {
        strategyId: selectedStrategy.id,
        allocation: {
          type: allocationType,
          ...(allocationType === "percentage"
            ? { percentage: Number(allocation) }
            : { usdValue: Number(allocation) }),
        },
      };

      // Only recalculate if the strategy or allocation has actually changed
      if (
        !lastCalculation ||
        lastCalculation.strategyId !== currentCalculation.strategyId ||
        JSON.stringify(lastCalculation.allocation) !==
          JSON.stringify(currentCalculation.allocation)
      ) {
        setLastCalculation(currentCalculation);
        onRebalance(selectedStrategy, currentCalculation.allocation);
      }
    }
  }, [
    selectedStrategy,
    allocation,
    allocationType,
    isRebalancing,
    onRebalance,
    lastCalculation,
  ]);

  const handleAllocationChange = (value: string | number[]) => {
    if (typeof value === "string") {
      setAllocation(value);
    } else {
      setAllocation(value[0].toString());
    }
  };

  const handleSave = () => {
    if (selectedStrategy && rebalanceOutput) {
      const operation = {
        strategy: selectedStrategy,
        allocation: {
          type: allocationType,
          ...(allocationType === "percentage"
            ? { percentage: Number(allocation) }
            : { usdValue: Number(allocation) }),
        },
        actions: rebalanceOutput.actions.map((action) => ({
          ...action,
          to: {
            ...action.to,
            coinType: action.to.coin_type,
            chain_name: "ZetaChain",
            balance: "0",
          },
        })),
      };
      addOperation(operation);
      onOpenChange(false);
      // Get the latest operation from the store (it will be the first one since we add to the beginning)
      const operations = useRebalancingStore.getState().operations;
      const newOperation = operations[0];

      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      router.push(`/rebalancing/${newOperation.id}`);
    }
  };

  // Transform rebalanceOutput actions into SwapAction type
  const swapActions: SwapAction[] =
    rebalanceOutput?.actions.map((action) => ({
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
      to: {
        symbol: action.to.symbol,
        name: action.to.name,
        chain_id: action.to.chain_id,
        coin_type: action.to.coin_type,
        coinType: action.to.coin_type,
        decimals: action.to.decimals,
        contract: action.to.contract,
        zrc20: action.to.zrc20,
        chain_name: "ZetaChain", // Since all target tokens are on ZetaChain
        balance: "0", // Not needed for target token
      },
      fromUsdValue: action.fromUsdValue,
      fromTokenValue: action.fromTokenValue,
      toPrice: action.toPrice,
    })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] h-[800px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rebalance Portfolio</DialogTitle>
          <DialogDescription>
            Select a strategy and allocation percentage to rebalance your
            portfolio.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Left side - Strategy Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Strategies</h3>
              <div className="flex flex-wrap gap-4">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className={cn(
                      "relative flex cursor-pointer flex-col rounded-lg border p-4 transition-colors hover:bg-accent flex-1 min-w-[250px]",
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
                <Label htmlFor="allocation">
                  {allocationType === "percentage"
                    ? "Allocation Percentage"
                    : "Allocation USD Value"}
                </Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[Number(allocation)]}
                    onValueChange={handleAllocationChange}
                    max={
                      allocationType === "percentage"
                        ? 100
                        : totalPortfolioValue
                    }
                    step={allocationType === "percentage" ? 1 : 100}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      id="allocation"
                      type="number"
                      min="1"
                      max={
                        allocationType === "percentage"
                          ? "100"
                          : totalPortfolioValue.toString()
                      }
                      value={allocation}
                      onChange={(e) => handleAllocationChange(e.target.value)}
                      className="w-32"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant={
                          allocationType === "usd_value" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setAllocationType("usd_value")}
                        className="h-8 w-8 p-0"
                      >
                        $
                      </Button>
                      <Button
                        variant={
                          allocationType === "percentage"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setAllocationType("percentage");
                          setAllocation("2");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        %
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Actions List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Actions</h3>
              {rebalanceOutput ? (
                rebalanceOutput.actions.length > 0 ? (
                  <RebalancingActions
                    actions={swapActions}
                    readOnly={true}
                    rebalancingId={crypto.randomUUID()}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    With the current strategy and allocation, your portfolio is
                    already balanced. Try selecting a different strategy or
                    adjusting the allocation to see rebalancing actions.
                  </div>
                )
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a strategy and allocation to see the actions.
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRebalancing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!rebalanceOutput?.actions.length || isRebalancing}
          >
            Proceed with Rebalancing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
