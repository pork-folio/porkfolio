import { DynamicConnectButton as DynamicConnectButtonBase } from "@dynamic-labs/sdk-react-core";

export function DynamicConnectButton() {
  return (
    <DynamicConnectButtonBase>
      <div className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
        Connect Wallet
      </div>
    </DynamicConnectButtonBase>
  );
}
