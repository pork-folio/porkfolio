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
import { RebalancingActions } from "@/components/rebalancing-actions";

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
          <RebalancingActions
            actions={operation.actions}
            rebalancingId={operation.id}
          />
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
