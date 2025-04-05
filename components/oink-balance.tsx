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

export function OinkBalance({
  className,
  onBalanceChange,
  onReveal,
}: {
  className?: string;
  onBalanceChange?: (balance: string) => void;
  onReveal?: () => void;
}) {
  const { primaryWallet } = useDynamicContext();
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const clickMessages = [
    "Stop clicking!",
    "Clicking won't give you OINK",
    "Seriously, stop it!",
    "You're not getting more OINK this way",
    "Rebalance to get OINK instead!",
    "I'm warning you...",
    "Last warning!",
    "Fine, keep clicking...",
    "You're persistent, I'll give you that",
    "Are you trying to break the button?",
    "The button is getting tired",
    "Please, have mercy on the button",
    "You win, I give up",
    "Ok, fine, continue clicking",
  ];

  const handleClick = (event: React.MouseEvent) => {
    if (!isRevealed) {
      setIsRevealed(true);
      onReveal?.();
    } else {
      setClickCount((prev) => prev + 1);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    emojiBlast({
      emojis: ["🐷", "🐖", "🐽"],
      emojiCount: 60,
      position: { x, y },
      physics: {
        fontSize: { min: 15, max: 35 },
        gravity: 0.3,
        initialVelocities: {
          x: { min: -15, max: 15 },
          y: { min: -15, max: 15 },
          rotation: { min: -30, max: 30 },
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
        onBalanceChange?.(formattedBalance);
      } catch (error) {
        console.error("Error fetching OINK balance:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, [primaryWallet?.address, onBalanceChange]);

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

  const balanceNum = parseFloat(balance);
  const isZeroBalance = balanceNum === 0;

  const getDisplayText = () => {
    if (!isRevealed) {
      return "How many OINK tokens do I have?";
    }

    if (clickCount > 0) {
      const messageIndex = Math.min(clickCount - 1, clickMessages.length - 1);
      return clickMessages[messageIndex];
    }

    if (isZeroBalance) {
      return "Oh no, zero! Rebalance to get OINK";
    }

    return (
      <>
        <span>You own</span>
        <span className="font-semibold">{balanceNum.toFixed(2)}</span>
        <span>OINK</span>
      </>
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`flex h-11 transition-transform hover:scale-102 active:scale-98 items-center justify-center gap-2 px-4 rounded-lg bg-gradient-to-r from-[rgb(183,105,124)] via-[rgb(153,75,94)] to-[rgb(123,45,64)] hover:from-[rgb(163,85,104)] hover:via-[rgb(133,55,74)] hover:to-[rgb(103,25,44)] text-white transition-all duration-300 cursor-pointer ${className}`}
    >
      <PiggyBank className="h-6 w-6" />
      <div className="flex items-center gap-1 text-base">
        {getDisplayText()}
      </div>
    </div>
  );
}
