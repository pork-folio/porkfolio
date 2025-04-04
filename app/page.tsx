"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DynamicConnectButton } from "@/components/dynamic-connect-button";
import { PortfolioVideo } from "@/components/portfolio-video";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRouter } from "next/navigation";
import { TwitterLink } from "@/components/ui/twitter-link";


export default function Page() {
  const { primaryWallet } = useDynamicContext();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set loading to false after a short delay to prevent flash
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (primaryWallet?.address) {
      router.push("/portfolio");
    }
  }, [primaryWallet?.address, router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-md flex flex-col items-center text-center space-y-6">
            <PortfolioVideo src="/porkfolio-looped.mp4" className="w-3/4 max-w-xs mt-6 mb-2" />
            <div className="py-2 mt-4">
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="text-color-pork">Pork</span>folio 🐽
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Your Universal piggy bank — auto-rebalance portfolio across chains with AI
            </p>
            <DynamicConnectButton />
            <div className="w-full p-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-none">
                  <AccordionTrigger className="text-left">
                    What is Porkfolio?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Porkfolio is a portfolio management platform for ZetaChain
                    that helps you track and manage your assets across different chains.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-none">
                  <AccordionTrigger className="text-left">
                    How do I connect my wallet?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Click the &quot;Connect Wallet&quot; button above and select
                    your preferred wallet from the list of supported options.
                    Make sure you have a compatible wallet installed in your
                    browser.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-none">
                  <AccordionTrigger className="text-left">
                    Which networks are supported?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Porkfolio supports both ZetaChain mainnet and testnet. You
                    can switch between networks in the settings after connecting
                    your wallet.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border-none">
                  <AccordionTrigger className="text-left">
                    How do I track my portfolio?
                  </AccordionTrigger>
                  <AccordionContent className="text-left">
                    Once connected, your portfolio will automatically display
                    all your assets across supported chains. You can refresh the
                    data using the refresh button in the top right corner.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <TwitterLink handle="PorkfolioApp" />
          </div>
        </div>
      )}
    </div>
  );
}
