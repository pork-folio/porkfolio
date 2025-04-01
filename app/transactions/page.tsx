import { Metadata } from "next";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Transactions | Porkfolio",
  description: "View your transaction history",
};

export default function TransactionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-3xl font-bold">Transactions</h1>
                <p className="text-muted-foreground mt-2">
                  View your transaction history here.
                </p>
              </div>
              <div className="px-4 lg:px-6">
                <div className="rounded-md border">
                  {/* Transaction table will go here */}
                  <div className="p-4 text-center text-muted-foreground">
                    No transactions yet
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
