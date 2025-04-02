import { ethers } from "ethers";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { getSigner } from "@dynamic-labs/ethers-v6";
import { getAddress } from "@zetachain/protocol-contracts";
import { useTransactionStore } from "@/store/transactions";
import { useBalanceStore } from "@/store/balances";
import { fetchBalances } from "./balances";
import { Wallet } from "@dynamic-labs/sdk-react-core";

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
};

type ChainName =
  | "eth_mainnet"
  | "bsc_mainnet"
  | "polygon_mainnet"
  | "arbitrum_mainnet"
  | "avalanche_mainnet"
  | "zeta_mainnet"
  | "btc_mainnet";

export async function handleDeposit(
  tokenInfo: TokenInfo,
  primaryWallet: Wallet | null,
  setLoadingStates: (
    callback: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void
) {
  try {
    setLoadingStates((prev) => ({
      ...prev,
      [`${tokenInfo.symbol}-${tokenInfo.chainName}`]: true,
    }));
    if (!primaryWallet) {
      alert("Please connect your wallet first");
      return;
    }

    await primaryWallet.switchNetwork(parseInt(tokenInfo.chainId));

    const signer = await getSigner(primaryWallet);

    const client = new ZetaChainClient({
      network: tokenInfo.chainId === "7000" ? "mainnet" : "testnet",
      signer,
    });

    // Get the gateway address for the source chain
    const gatewayAddress = getAddress(
      "gateway",
      tokenInfo.chainName.toLowerCase().replace(" ", "_") as ChainName
    );

    if (!gatewayAddress) {
      throw new Error(
        `Gateway address not found for chain ${tokenInfo.chainName}`
      );
    }

    // Calculate deposit amount
    let depositAmount = tokenInfo.balance;
    if (tokenInfo.coin_type === "Gas") {
      // For gas tokens, leave some for gas and deposit the rest
      const totalAmount = ethers.parseUnits(
        tokenInfo.balance,
        tokenInfo.decimals
      );

      // Estimate gas cost for a typical transaction (can be adjusted based on network)
      const estimatedGasCost = ethers.parseUnits("0.01", tokenInfo.decimals);

      // If balance is less than 2x the estimated gas cost, use 50% of balance
      // Otherwise, leave the estimated gas cost and deposit the rest
      let depositAmountBigInt;
      if (totalAmount < estimatedGasCost * BigInt(2)) {
        depositAmountBigInt = totalAmount / BigInt(2);
      } else {
        depositAmountBigInt = totalAmount - estimatedGasCost;
      }

      depositAmount = ethers.formatUnits(
        depositAmountBigInt,
        tokenInfo.decimals
      );
    }

    // Create revert options
    const revertOptions = {
      revertAddress: ethers.ZeroAddress,
      callOnRevert: false,
      onRevertGasLimit: 0,
      revertMessage: "",
    };

    // Create transaction options
    const txOptions = {
      gasLimit: undefined,
      gasPrice: undefined,
    };

    console.log("evmDeposit", {
      amount: depositAmount,
      ...(tokenInfo.coin_type !== "Gas" && { erc20: tokenInfo.contract }), // Only include erc20 for non-gas tokens
      gatewayEvm: gatewayAddress,
      receiver: primaryWallet.address,
      revertOptions,
      txOptions,
    });

    // Execute deposit
    const tx = await client.evmDeposit({
      amount: depositAmount,
      ...(tokenInfo.coin_type !== "Gas" && { erc20: tokenInfo.contract }), // Only include erc20 for non-gas tokens
      gatewayEvm: gatewayAddress,
      receiver: primaryWallet.address,
      revertOptions,
      txOptions,
    });

    // Add transaction to store with hash
    useTransactionStore.getState().addTransaction({
      type: "deposit",
      tokenSymbol: tokenInfo.symbol,
      chainName: tokenInfo.chainName,
      amount: depositAmount,
      status: "pending",
      hash: tx.hash,
    });

    console.log("Deposit transaction:", tx);
    await tx.wait();
    console.log("Deposit successful!");

    // Refresh balances after successful deposit
    if (primaryWallet.address) {
      const balancesData = await fetchBalances(
        primaryWallet.address,
        tokenInfo.chainId !== "7000"
      );
      useBalanceStore.getState().setBalances(balancesData);
    }
  } catch (error) {
    console.error("Deposit failed:", error);
  } finally {
    setLoadingStates((prev) => ({
      ...prev,
      [`${tokenInfo.symbol}-${tokenInfo.chainName}`]: false,
    }));
  }
}
