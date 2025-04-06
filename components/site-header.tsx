"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { DynamicWallet } from "@/components/dynamic-wallet";
import { useNetwork } from "@/components/providers";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function SiteHeader() {
  const { isTestnet, toggleNetwork } = useNetwork();
  const [showMainnetWarning, setShowMainnetWarning] = useState(false);

  const handleNetworkChange = (value: string) => {
    if (value === "testnet" && !isTestnet) {
      toggleNetwork();
    } else if (value === "mainnet" && isTestnet) {
      setShowMainnetWarning(true);
    }
  };

  const handleMainnetConfirm = () => {
    toggleNetwork();
    setShowMainnetWarning(false);
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex h-full w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="ml-auto flex items-center gap-2">
          <DynamicWallet />

          <ToggleGroup
            type="single"
            value={isTestnet ? "testnet" : "mainnet"}
            onValueChange={handleNetworkChange}
            variant="outline"
            size="default"
            className="text-sm"
          >
            <ToggleGroupItem value="mainnet">Mainnet</ToggleGroupItem>
            <ToggleGroupItem value="testnet">Testnet</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <AlertDialog
        open={showMainnetWarning}
        onOpenChange={setShowMainnetWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mainnet Warning</AlertDialogTitle>
            <AlertDialogDescription>
              This application has not been audited and is not recommended for
              use on mainnet yet. Please proceed with caution and only use small
              amounts of funds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMainnetConfirm}>
              I understand, proceed to mainnet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
