"use client";

import { useEffect, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ethers } from "ethers";
import { PiggyBank } from "lucide-react";
import { emojiBlast } from "emoji-blast";

const OINK_CONTRACT = "0xF14773cc4bF0c5aeA0e50d14E00a5d266267f4A6";
const RPC_URL = "https://zetachain-athens-evm.blockpi.network/v1/rpc/public";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export function OinkBalance({ className }: { className?: string }) {
  const { primaryWallet } = useDynamicContext();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  const handleClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    emojiBlast({
      emojis: ["🐷", "🐖", "🐽", "🐗", "🐖"],
      emojiCount: 20,
      position: { x, y },
      physics: {
        fontSize: { min: 20, max: 30 },
        gravity: 0.2,
        initialVelocities: {
          x: { min: -8, max: 8 },
          y: { min: -12, max: -8 },
          rotation: { min: -10, max: 10 },
        },
      },
    });
  };

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
      <div
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-muted/50 animate-pulse ${className}`}
      >
        <PiggyBank className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading balance...
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg bg-gradient-to-r from-[rgb(183,105,124)] via-[rgb(153,75,94)] to-[rgb(123,45,64)] hover:from-[rgb(163,85,104)] hover:via-[rgb(133,55,74)] hover:to-[rgb(103,25,44)] text-white transition-all duration-300 cursor-pointer ${className}`}
    >
      <PiggyBank className="h-6 w-6" />
      <div className="flex items-center gap-1 text-base">
        <span>You own</span>
        <span className="font-semibold">{parseFloat(balance).toFixed(2)}</span>
        <span>OINK</span>
      </div>
    </div>
  );
}
