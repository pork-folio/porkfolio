import { ethers } from "ethers";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { getSigner } from "@dynamic-labs/ethers-v6";
import { useTransactionStore } from "@/store/transactions";
import { useBalanceStore } from "@/store/balances";
import { fetchBalances } from "./balances";
import { Wallet } from "@dynamic-labs/sdk-react-core";

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

export interface SwapAction {
  from: TokenInfo;
  to: TokenInfo & { coinType: string };
  fromUsdValue: number;
  toPrice: PriceInfo;
}

export async function executeRebalancingSwap(
  action: SwapAction,
  primaryWallet: Wallet | null
) {
  try {
    if (!primaryWallet?.address) {
      console.error("Wallet state:", {
        primaryWallet,
        address: primaryWallet?.address,
        isConnected: !!primaryWallet?.address,
      });
      throw new Error("Please connect your wallet first");
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

    return true;
  } catch (error) {
    console.error("Swap failed:", error);
    throw error;
  }
}
