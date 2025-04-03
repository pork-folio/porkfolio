import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to format chain names
export function formatChainName(chainName: string): string {
  // Replace underscores with spaces
  let formatted = chainName.replace(/_/g, " ");

  // Capitalize each word
  formatted = formatted
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Replace "Zeta" with "ZetaChain"
  formatted = formatted.replace(/Zeta\b/g, "ZetaChain");

  return formatted;
}
