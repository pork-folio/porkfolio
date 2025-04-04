"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRebalancingStore } from "@/store/rebalancing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import { RebalancingActions } from "@/components/rebalancing-actions";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { use } from "react";
import { useTransactionStore } from "@/store/transactions";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useNetwork } from "@/components/providers";

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

export default function RebalancingOperationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const operation = useRebalancingStore((state) =>
    state.operations.find((op) => op.id === id)
  );
  const transactions = useTransactionStore((state) => state.transactions);
  const updateTransactionStatus = useTransactionStore(
    (state) => state.updateTransactionStatus
  );
  const { isTestnet } = useNetwork();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!operation) {
    return (
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push("/rebalancing")}
                    >
                      <IconArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-3xl font-bold">Operation Not Found</h1>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    The rebalancing operation you're looking for doesn't exist.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const findTransactionStatus = (action: any) => {
    const matchingTransaction = transactions.find(
      (tx) =>
        tx.rebalancingGroupId === operation.id &&
        tx.targetToken?.symbol === action.to.symbol &&
        tx.amount === action.fromTokenValue.toString()
    );
    return matchingTransaction?.status;
  };

  const calculateProgress = () => {
    const completedActions = operation.actions.filter(
      (action) => findTransactionStatus(action) === "completed"
    ).length;
    return (completedActions / operation.actions.length) * 100;
  };

  const refreshAllStatuses = async () => {
    setIsRefreshing(true);
    const startTime = Date.now();

    try {
      const rebalancingTransactions = transactions.filter(
        (tx) => tx.rebalancingGroupId === operation.id
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
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/rebalancing")}
                    className="w-fit"
                  >
                    <IconArrowLeft className="mr-2 h-4 w-4" />
                    Back to Rebalancing
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold">
                      {operation.strategy.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-muted-foreground">
                        {operation.allocation}% allocation •{" "}
                        {formatDistanceToNow(operation.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                      <Badge
                        variant={
                          operation.status === "completed"
                            ? "default"
                            : operation.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {operation.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 lg:px-6">
                <div className="space-y-4">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-xl font-semibold">Progress</h2>
                      <Badge variant="outline">{Math.round(progress)}%</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={progress} className="h-2 flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshAllStatuses}
                        disabled={isRefreshing}
                      >
                        <style>{refreshAnimation}</style>
                        <IconRefresh
                          className={`mr-2 h-4 w-4 ${
                            isRefreshing
                              ? "animate-[spin_1s_linear_infinite]"
                              : ""
                          }`}
                        />
                        Refresh Statuses
                      </Button>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold">Actions</h2>
                  <div className="max-w-2xl">
                    <RebalancingActions
                      actions={operation.actions}
                      rebalancingId={operation.id}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
