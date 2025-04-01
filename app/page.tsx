import { AppSidebar } from "@/components/app-sidebar";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import * as core from "@/core";

import data from "./data.json";

export default async function Page() {
  // showcase that it works
  const assets = core.supportedAssets();

  console.log("Supported assets", assets);

  const prices = await core.queryAssetPrices(assets);

  console.log("Pyth Prices", prices);

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
