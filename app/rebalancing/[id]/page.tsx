"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRebalancingStore } from "@/store/rebalancing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { RebalancingActions } from "@/components/rebalancing-actions";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { use } from "react";

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
                  <h2 className="text-xl font-semibold">Actions</h2>
                  <div className="max-w-2xl">
                    <RebalancingActions actions={operation.actions} />
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
