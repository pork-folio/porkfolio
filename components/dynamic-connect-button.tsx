import { DynamicConnectButton as DynamicConnectButtonBase } from "@dynamic-labs/sdk-react-core";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export function DynamicConnectButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { setShowAuthFlow, primaryWallet } = useDynamicContext();

  useEffect(() => {
    const handleAuthFlowEvent = () => {
      setIsLoading(false);
    };

    const connectButton = document.querySelector(
      "[data-dynamic-connect-button]"
    );
    if (connectButton) {
      connectButton.addEventListener("authFlowClose", handleAuthFlowEvent);
      connectButton.addEventListener("authFlowCancel", handleAuthFlowEvent);
      return () => {
        connectButton.removeEventListener("authFlowClose", handleAuthFlowEvent);
        connectButton.removeEventListener(
          "authFlowCancel",
          handleAuthFlowEvent
        );
      };
    }
  }, []);

  const handleClick = () => {
    setIsLoading(true);
    setShowAuthFlow(true);
  };

  return (
    <div onClick={handleClick} data-dynamic-connect-button>
      <DynamicConnectButtonBase>
        <div
          className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 ${
            primaryWallet ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect Wallet"
          )}
        </div>
      </DynamicConnectButtonBase>
    </div>
  );
}
