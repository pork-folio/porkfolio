"use client";

import { useEffect, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ethers } from "ethers";
import { PiggyBank } from "lucide-react";

const OINK_CONTRACT = "0xF14773cc4bF0c5aeA0e50d14E00a5d266267f4A6";
const RPC_URL = "https://zetachain-athens-evm.blockpi.network/v1/rpc/public";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export function OinkBalance() {
  const { primaryWallet } = useDynamicContext();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      if (!primaryWallet?.address) return;

      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(
          OINK_CONTRACT,
          ERC20_ABI,
          provider
        );

        const [balance, decimals] = await Promise.all([
          contract.balanceOf(primaryWallet.address),
          contract.decimals(),
        ]);

        const formattedBalance = ethers.formatUnits(balance, decimals);
        setBalance(formattedBalance);
      } catch (error) {
        console.error("Error fetching OINK balance:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [primaryWallet?.address]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 animate-pulse">
        <PiggyBank className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading balance...
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
      <PiggyBank className="h-5 w-5 text-primary" />
      <div className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground">You own</span>
        <span className="font-semibold text-primary">
          {parseFloat(balance).toFixed(2)}
        </span>
        <span className="text-muted-foreground">OINK</span>
      </div>
    </div>
  );
}
