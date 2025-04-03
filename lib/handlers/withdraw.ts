import { ethers } from "ethers";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { getSigner } from "@dynamic-labs/ethers-v6";
import ERC20_ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { useTransactionStore } from "@/store/transactions";
import { getAddress } from "@zetachain/protocol-contracts";
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

export async function handleWithdraw(
  tokenInfo: TokenInfo,
  primaryWallet: Wallet | null,
  setLoadingStates: (
    callback: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void,
  recipientAddress: string
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
    const contract = new ethers.Contract(
      tokenInfo.contract!,
      ERC20_ABI.abi,
      signer
    );

    // Approve gateway to spend the full balance
    const balance = await contract.balanceOf(primaryWallet.address);
    const approveTx = await contract.approve(gatewayAddress, balance);
    await approveTx.wait();
    console.log("Gateway approved to spend tokens");

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

    // Calculate withdrawal amount based on whether the token is a gas token or not
    const totalAmount = balance;

    let withdrawalAmount;

    // console.log("balance", balance);
    // console.log("totalAmount", totalAmount);
    // console.log("gasFee", gasFee);
    // console.log("withdrawalAmount", totalAmount - gasFee);
    // Check if the token being withdrawn is the same as the gas token
    if (tokenInfo.contract?.toLowerCase() === gasZRC20.toLowerCase()) {
      withdrawalAmount = totalAmount - gasFee;
    } else {
      withdrawalAmount = totalAmount;
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
      gasPrice: ethers.parseUnits("50", "gwei"),
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
      nonce: undefined,
    };

    console.log("zetachainWithdraw", {
      amount: ethers.formatUnits(withdrawalAmount, tokenInfo.decimals),
      receiver: recipientAddress,
      zrc20: tokenInfo.contract!,
      gatewayZetaChain: gatewayAddress,
      revertOptions,
      txOptions,
    });

    // Execute withdrawal with adjusted amount
    const { tx } = await client.zetachainWithdraw({
      amount: ethers.formatUnits(withdrawalAmount, tokenInfo.decimals),
      receiver: recipientAddress,
      zrc20: tokenInfo.contract!,
      gatewayZetaChain: gatewayAddress,
      revertOptions,
      txOptions,
    });

    console.log("Withdrawal transaction:", tx);
    await tx.wait();

    // Find the target token (the corresponding token on the destination chain)
    const balances = useBalanceStore.getState().balances;
    const targetToken = balances.find(
      (token) =>
        token.zrc20?.toLowerCase() === tokenInfo.contract?.toLowerCase() &&
        token.chain_id !== tokenInfo.chainId
    );

    // Add transaction to store with hash and token information
    useTransactionStore.getState().addTransaction({
      type: "withdraw",
      tokenSymbol: tokenInfo.symbol,
      chainName: tokenInfo.chainName,
      amount: ethers.formatUnits(withdrawalAmount, tokenInfo.decimals),
      status: "pending",
      hash: tx.hash,
      sourceToken: {
        symbol: tokenInfo.symbol,
        chainName: tokenInfo.chainName,
        contract: tokenInfo.contract,
        chainId: tokenInfo.chainId,
        coin_type: tokenInfo.coin_type,
      },
      targetToken: targetToken
        ? {
            symbol: targetToken.symbol,
            chainName: targetToken.chain_name,
            contract: targetToken.zrc20,
            chainId: targetToken.chain_id,
            coin_type: targetToken.coin_type,
          }
        : undefined,
    });
    console.log("Withdrawal successful!");

    // Refresh balances after successful withdrawal
    if (primaryWallet.address) {
      const balancesData = await fetchBalances(
        primaryWallet.address,
        tokenInfo.chainId !== "7000"
      );
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
