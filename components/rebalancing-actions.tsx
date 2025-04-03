import { RebalancingOperation } from "@/store/rebalancing";
import { useState } from "react";
import { ethers } from "ethers";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { getSigner } from "@dynamic-labs/ethers-v6";
import { useTransactionStore } from "@/store/transactions";
import { useBalanceStore } from "@/store/balances";
import { fetchBalances } from "@/lib/handlers/balances";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

interface TokenInfo {
  chain_id: string;
  coin_type: string;
  contract?: string;
  decimals: number;
  symbol: string;
  chain_name: string;
  balance: string;
  zrc20?: string;
  chainId?: string;
  name?: string;
}

interface PriceInfo {
  usdRate: number;
}

interface SwapAction {
  from: TokenInfo;
  to: TokenInfo & { coinType: string };
  fromUsdValue: number;
  toPrice: PriceInfo;
}

interface RebalancingActionsProps {
  actions: SwapAction[];
}

export function RebalancingActions({ actions }: RebalancingActionsProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const { primaryWallet } = useDynamicContext();

  const executeSwap = async (action: SwapAction) => {
    try {
      const actionKey = `${action.from.symbol}-${action.to.symbol}`;
      setLoadingStates((prev) => ({ ...prev, [actionKey]: true }));

      // Enhanced wallet connection check
      if (!primaryWallet?.address) {
        console.error("Wallet state:", {
          primaryWallet,
          address: primaryWallet?.address,
          isConnected: !!primaryWallet?.address,
        });
        alert("Please connect your wallet first");
        return;
      }

      console.log("Starting swap with wallet:", {
        address: primaryWallet.address,
        chainId: action.from.chain_id,
      });

      await primaryWallet.switchNetwork(parseInt(action.from.chain_id));

      const signer = await getSigner(primaryWallet);
      if (!signer) {
        throw new Error("Failed to get signer");
      }

      console.log("Got signer:", {
        address: await signer.getAddress(),
        chainId: (await signer.provider?.getNetwork())?.chainId,
      });

      const client = new ZetaChainClient({
        network: action.from.chain_id === "7000" ? "mainnet" : "testnet",
        signer,
      });

      // Gateway address for BSC testnet
      const gatewayAddress = "0x0c487a766110c85d301d96e33579c5b317fa4995";
      const receiverAddress = "0x0cf3e61a95137172bb064C209a12e31003a23B8B";

      // Prepare parameters for the swap
      const types = ["address", "address", "bool"];
      const values: [string, string, boolean] = [
        action.to.zrc20 || "", // target token address
        primaryWallet.address, // recipient
        true, // boolean flag
      ];

      // Execute deposit and call
      const tx = await client.evmDepositAndCall({
        amount: action.from.balance,
        erc20: action.from.contract,
        gatewayEvm: gatewayAddress,
        receiver: receiverAddress,
        types,
        values,
        revertOptions: {
          revertAddress: ethers.ZeroAddress,
          callOnRevert: false,
          onRevertGasLimit: 0,
          revertMessage: "",
        },
        txOptions: {
          gasLimit: undefined,
          gasPrice: undefined,
        },
      });

      // Add transaction to store
      useTransactionStore.getState().addTransaction({
        type: "deposit", // Using deposit type since it's similar to a deposit operation
        tokenSymbol: action.from.symbol,
        chainName: action.from.chain_name,
        amount: action.from.balance,
        status: "pending",
        hash: tx.hash,
        sourceToken: {
          symbol: action.from.symbol,
          chainName: action.from.chain_name,
          contract: action.from.contract,
          chainId: action.from.chain_id,
          coin_type: action.from.coin_type,
        },
        targetToken: {
          symbol: action.to.symbol,
          chainName: "ZetaChain",
          contract: action.to.zrc20,
          chainId: action.to.chainId || action.to.chain_id,
          coin_type: action.to.coinType,
        },
      });

      await tx.wait();
      console.log("Swap successful!");

      // Refresh balances
      if (primaryWallet.address) {
        const balancesData = await fetchBalances(
          primaryWallet.address,
          action.from.chain_id !== "7000"
        );
        useBalanceStore.getState().setBalances(balancesData);
      }
    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed. Please try again.");
    } finally {
      const actionKey = `${action.from.symbol}-${action.to.symbol}`;
      setLoadingStates((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  return (
    <div className="py-4">
      <div className="space-y-4">
        {actions.map((action, index) => {
          const actionKey = `${action.from.symbol}-${action.to.symbol}`;
          const isLoading = loadingStates[actionKey];

          return (
            <div
              key={index}
              className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                isLoading ? "opacity-50" : "hover:bg-gray-50"
              }`}
              onClick={() => !isLoading && executeSwap(action)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Swap {action.from.balance} {action.from.symbol} for{" "}
                    {action.to.symbol}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    From: {action.from.balance} {action.from.symbol} ($
                    {action.fromUsdValue.toFixed(2)})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    To: {action.to.symbol} ($
                    {(action.fromUsdValue / action.toPrice.usdRate).toFixed(6)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    ${action.fromUsdValue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">USD Value</p>
                  {isLoading && (
                    <p className="text-xs text-blue-500 mt-1">Processing...</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
