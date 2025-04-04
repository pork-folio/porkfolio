import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { IconCoin } from "@tabler/icons-react";

export interface CryptoIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

const iconMap = new Map<string, boolean>([
  ["avax", true],
  ["bnb", true],
  ["btc", true],
  ["cbbtc", true],
  ["dai", true],
  ["eth", true],
  ["pepe", true],
  ["pol", true],
  ["shib", true],
  ["sol", true],
  ["sui", true],
  ["ton", true],
  ["usdc", true],
  ["usdt", true],
  ["wbtc", true],
  ["zeta", true],
]);

export function CryptoIcon({ symbol, size = 24, className }: CryptoIconProps) {
  const iconName = getIconName(symbol);

  // fallback to a generic icon
  if (!iconMap.has(iconName)) {
    console.log(`No icon found for ${symbol} (${iconName})`);
    return (
      <IconCoin size={size} className={cn("inline-block text-muted-foreground", className)} />
    );
  }

  const src = `/icons/crypto/${iconName}.png`;

  return (
    <Image src={src} alt={`${iconName} icon`}
      width={size} height={size}
      className={cn("inline-block", className)}
    />
  );
}

export function getIconName(symbol: string): string {
  const name = symbol.toLowerCase().split(".")[0];

  if (name === "matic") {
    return "pol";
  }

  if (name.startsWith("usdc")) {
    return "usdc";
  }

  return name;
}
