import { SidebarTrigger } from "@/components/ui/sidebar";
import { DynamicWallet } from "@/components/dynamic-wallet";
import { useNetwork } from "@/components/providers";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { isTestnet, toggleNetwork } = useNetwork();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex h-full w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleNetwork}
            className="text-xs"
          >
            {isTestnet ? "Testnet" : "Mainnet"}
          </Button>
          <DynamicWallet />
        </div>
      </div>
    </header>
  );
}
