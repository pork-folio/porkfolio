"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect } from "react";

import data from "./data.json";

export default function Page() {
  const { primaryWallet } = useDynamicContext();
  const client = new ZetaChainClient({ network: "testnet" });

  useEffect(() => {
    const fetchBalances = async () => {
      if (primaryWallet?.address) {
        const balances = await client.getBalances({
          evmAddress: primaryWallet.address,
        });
        console.log("Balances:", balances);
      }
    };

    fetchBalances();
  }, [primaryWallet?.address]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-3xl font-bold">Portfolio</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your portfolio positions here.
                </p>
              </div>
              <div className="px-4 lg:px-6">
                <DataTable data={data} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
