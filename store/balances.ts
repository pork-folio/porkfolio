import { create } from "zustand";
import { BalanceData } from "@/lib/handlers/balances";

interface BalanceStore {
  balances: BalanceData[];
  setBalances: (balances: BalanceData[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export const useBalanceStore = create<BalanceStore>((set) => ({
  balances: [],
  setBalances: (balances) => set({ balances }),
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
}));
