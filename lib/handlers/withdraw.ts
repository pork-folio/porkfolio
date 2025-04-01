import { ethers } from "ethers";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { getSigner } from "@dynamic-labs/ethers-v6";
import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { useTransactionStore } from "@/store/transactions";
import { getAddress } from "@zetachain/protocol-contracts";
import { useBalanceStore } from "@/store/balances";
import { fetchBalances } from "./balances";

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

export async function handleWithdraw(
  tokenInfo: TokenInfo,
  primaryWallet: any,
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

    const network = tokenInfo.chainId === "7000" ? "mainnet" : "testnet";

    await primaryWallet.switchNetwork(parseInt(tokenInfo.chainId));

    // Get the signer from Dynamic
    const signer = await getSigner(primaryWallet);
    const client = new ZetaChainClient({
      network,
      signer,
    });

    const gatewayAddress = getAddress("gateway", "zeta_testnet");

    // Create ZRC20 contract instance for approval
    const zrc20Contract = new ethers.Contract(
      tokenInfo.contract!,
      ERC20_ABI.abi,
      signer
    );

    // // Approve gateway to spend the full balance
    // const balance = await zrc20Contract.balanceOf(primaryWallet.address);
    // const approveTx = await zrc20Contract.approve(gatewayAddress, balance);
    // await approveTx.wait();
    // console.log("Gateway approved to spend tokens");

    // // Create contract instance to get gas fee
    const zrc20ContractForGas = new ethers.Contract(
      tokenInfo.contract!,
      ["function withdrawGasFee() view returns (address, uint256)"],
      signer
    );

    console.log(tokenInfo.contract);

    // // Get gas fee information
    const [gasZRC20, gasFee] = await zrc20ContractForGas.withdrawGasFee();
    console.log("Gas fee:", gasFee.toString(), "Gas token:", gasZRC20);

    // Calculate withdrawal amount by subtracting gas fee and taking 90%
    const totalAmount = ethers.parseUnits(
      tokenInfo.balance,
      tokenInfo.decimals
    );
    const availableAmount = totalAmount - gasFee;
    const withdrawalAmount = (availableAmount * BigInt(90)) / BigInt(100);

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
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
      nonce: undefined,
    };

    console.log("zetachainWithdraw", {
      amount: ethers.formatUnits(withdrawalAmount, tokenInfo.decimals),
      receiver: primaryWallet.address,
      zrc20: tokenInfo.contract!,
      gatewayZetaChain: gatewayAddress,
      revertOptions,
      txOptions,
    });

    // Execute withdrawal with adjusted amount
    const { tx } = await client.zetachainWithdraw({
      amount: ethers.formatUnits(withdrawalAmount, tokenInfo.decimals),
      receiver: primaryWallet.address,
      zrc20: tokenInfo.contract!,
      gatewayZetaChain: gatewayAddress,
      revertOptions,
      txOptions,
    });

    // Add transaction to store with hash
    useTransactionStore.getState().addTransaction({
      type: "withdraw",
      tokenSymbol: tokenInfo.symbol,
      chainName: tokenInfo.chainName,
      amount: ethers.formatUnits(withdrawalAmount, tokenInfo.decimals),
      status: "pending",
      hash: tx.hash,
    });

    console.log("Withdrawal transaction:", tx);
    await tx.wait();
    console.log("Withdrawal successful!");

    // Refresh balances after successful withdrawal
    if (primaryWallet.address) {
      const balancesData = await fetchBalances(primaryWallet.address);
      useBalanceStore.getState().setBalances(balancesData);
    }
  } catch (error) {
    console.error("Withdrawal failed:", error);
  } finally {
    setLoadingStates((prev) => ({
      ...prev,
      [`${tokenInfo.symbol}-${tokenInfo.chainName}`]: false,
    }));
  }
}
