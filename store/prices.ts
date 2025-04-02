import { create } from "zustand";

interface Price {
  ticker: string;
  id: string;
  publishedAt: Date;
  usdRate: number;
}

interface PriceStore {
  prices: Price[];
  setPrices: (prices: Price[]) => void;
}

export const usePriceStore = create<PriceStore>((set) => ({
  prices: [],
  setPrices: (prices) => set({ prices }),
}));
