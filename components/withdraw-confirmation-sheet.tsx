"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { handleWithdraw } from "@/lib/handlers/withdraw";
import { formatChainName } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TokenInfo = {
  symbol: string;
  baseSymbol: string;
  chainName: string;
  balance: string;
  decimals: number;
  contract?: string;
  zrc20?: string;
  chainId: string;
  coin_type: string;
  ticker: string;
};

// Function to check if a chain is EVM-compatible
function isChainEVM(chainId: string, chains: any[]): boolean {
  const chain = chains.find((c) => c.chain_id === chainId);
  return chain?.vm === "evm";
}

export function WithdrawConfirmationSheet({
  token,
  nativeAsset,
  loadingStates,
  primaryWallet,
  setLoadingStates,
  chains,
}: {
  token: TokenInfo;
  nativeAsset: TokenInfo | null;
  loadingStates: Record<string, boolean>;
  primaryWallet: any;
  setLoadingStates: (
    value: React.SetStateAction<Record<string, boolean>>
  ) => void;
  chains: any[];
}) {
  const [recipientAddress, setRecipientAddress] = React.useState("");
  const targetChain = token.coin_type === "ZRC20" ? nativeAsset : token;
  const isTargetChainEVM = targetChain
    ? isChainEVM(targetChain.chainId, chains)
    : false;

  React.useEffect(() => {
    if (isTargetChainEVM) {
      setRecipientAddress(primaryWallet.address);
    }
  }, [isTargetChainEVM, primaryWallet.address]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={
            loadingStates[`${token.symbol}-${token.chainName}`] ||
            token.symbol === "ZETA" ||
            token.symbol === "WZETA"
          }
        >
          {loadingStates[`${token.symbol}-${token.chainName}`] ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Withdrawing...
            </div>
          ) : (
            "Withdraw"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Withdraw</DialogTitle>
          <div className="space-y-2">
            <DialogDescription>
              Please confirm that you want to withdraw {token.balance}{" "}
              {token.symbol} from {formatChainName(token.chainName)}
              {token.coin_type === "ZRC20" &&
                nativeAsset &&
                ` to ${formatChainName(nativeAsset.chainName)}`}
              .
            </DialogDescription>
            <div className="space-y-2 mt-4">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                readOnly={isTargetChainEVM}
                className="font-mono"
                placeholder={isTargetChainEVM ? "" : "Enter recipient address"}
              />
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4">
          <Button
            variant="default"
            className="w-full"
            onClick={() => {
              handleWithdraw(
                token,
                primaryWallet,
                setLoadingStates,
                recipientAddress
              );
            }}
            disabled={
              loadingStates[`${token.symbol}-${token.chainName}`] ||
              (!isTargetChainEVM && !recipientAddress)
            }
          >
            {loadingStates[`${token.symbol}-${token.chainName}`] ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Withdrawing...
              </div>
            ) : (
              "Confirm Withdrawal"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
