import { create } from "zustand";
import { Strategy } from "@/core";

interface AiStrategyState {
  strategy: Strategy | null;
  isLoading: boolean;
  error: string | null;
  setStrategy: (strategy: Strategy | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAiStrategyStore = create<AiStrategyState>((set) => ({
  strategy: null,
  isLoading: false,
  error: null,
  setStrategy: (strategy) => set({ strategy }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
