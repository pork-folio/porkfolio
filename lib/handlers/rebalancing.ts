import { ethers } from "ethers";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { getSigner } from "@dynamic-labs/ethers-v6";
import { useTransactionStore } from "@/store/transactions";
import { useBalanceStore } from "@/store/balances";
import { fetchBalances } from "./balances";
import { Wallet } from "@dynamic-labs/sdk-react-core";
import { getAddress, ParamChainName } from "@zetachain/protocol-contracts";
import { UNIVERSAL_SWAP_ADDRESSES } from "../constants";

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
  fromTokenValue: number;
  toPrice: PriceInfo;
}

export async function executeRebalancingSwap(
  action: SwapAction,
  primaryWallet: Wallet | null,
  rebalancingId: string,
  actionIndex: number
) {
  console.log("swap", action);
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

    // Get gateway address based on chain
    let gatewayAddress: string;
    if (
      ["arbitrum_mainnet", "avalanche_mainnet"].includes(action.from.chain_name)
    ) {
      gatewayAddress = "0x1C53e188Bc2E471f9D4A4762CFf843d32C2C8549";
    } else if (
      ["avalanche_testnet", "arbitrum_sepolia"].includes(action.from.chain_name)
    ) {
      gatewayAddress = "0x0dA86Dc3F9B71F84a0E97B0e2291e50B7a5df10f";
    } else {
      const addr = getAddress(
        "gateway",
        action.from.chain_name as ParamChainName
      );
      if (!addr) {
        throw new Error(
          `Gateway address not found for chain ${action.from.chain_name}`
        );
      }
      gatewayAddress = addr;
    }

    const receiverAddress =
      action.from.chain_id === "7001"
        ? UNIVERSAL_SWAP_ADDRESSES.testnet
        : UNIVERSAL_SWAP_ADDRESSES.mainnet;

    // Prepare parameters for the swap
    if (!action.to.zrc20 && action.to.symbol !== "ZETA") {
      throw new Error(
        `Missing ZRC20 address for target token ${action.to.symbol}`
      );
    }

    const zetaAddress = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

    let tx;
    if (action.from.chain_id === "7000" || action.from.chain_id === "7001") {
      // Direct contract interaction for ZetaChain swaps
      const ZRC20_ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint256)",
      ];

      const Swap_ABI = [
        "function swap(address zrc20, uint256 amount, address target, bytes memory recipient, bool withdraw) external",
      ];

      const zrc20Contract = new ethers.Contract(
        action.from.contract!,
        ZRC20_ABI,
        signer
      );
      const swapContract = new ethers.Contract(
        receiverAddress,
        Swap_ABI,
        signer
      );

      const amount = ethers.parseUnits(
        Number(action.fromTokenValue.toFixed(action.from.decimals)).toString(),
        action.from.decimals
      );

      // Check and approve if needed
      const allowance = await zrc20Contract.allowance(
        primaryWallet.address,
        receiverAddress
      );
      if (allowance < amount) {
        const approval = await zrc20Contract.approve(receiverAddress, amount);
        await approval.wait();
      }

      // Execute swap
      tx = await swapContract.swap(
        action.from.contract,
        amount,
        action.to.symbol === "ZETA" ? zetaAddress : action.to.zrc20!,
        ethers.toUtf8Bytes(primaryWallet.address),
        false
      );
    } else {
      // Use evmDepositAndCall for other chains
      const types = ["address", "bytes", "bool"];
      const values: [string, string, boolean] = [
        action.to.symbol === "ZETA"
          ? zetaAddress // Use specific ZETA address
          : action.to.zrc20!, // target token address (we know it exists due to the check above)
        primaryWallet.address, // recipient
        false, // boolean flag
      ];

      tx = await client.evmDepositAndCall({
        amount: Number(
          action.fromTokenValue.toFixed(action.from.decimals)
        ).toString(),
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
          gasLimit: BigInt(500000), // High gas limit for complex operations
          gasPrice: ethers.parseUnits("50", "gwei"), // High gas price
        },
      });
    }

    // Add transaction to store
    useTransactionStore.getState().addTransaction({
      type: "rebalance",
      tokenSymbol: action.from.symbol,
      chainName: action.from.chain_name,
      amount: action.fromTokenValue.toString(),
      status: "pending",
      hash: tx.hash,
      id: `${rebalancingId}_${actionIndex}`,
      rebalancingGroupId: rebalancingId,
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
    console.log({
      type: "rebalance",
      tokenSymbol: action.from.symbol,
      chainName: action.from.chain_name,
      amount: action.fromTokenValue.toString(),
      status: "pending",
      hash: tx.hash,
      id: `${rebalancingId}_${actionIndex}`,
      rebalancingGroupId: rebalancingId,
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
