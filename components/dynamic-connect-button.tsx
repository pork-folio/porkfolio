import { DynamicConnectButton as DynamicConnectButtonBase } from "@dynamic-labs/sdk-react-core";
import { Button } from "@/components/ui/button";

export function DynamicConnectButton() {
  return (
    <DynamicConnectButtonBase>
      <Button size="lg" className="w-[200px]">
        Connect Wallet
      </Button>
    </DynamicConnectButtonBase>
  );
}
