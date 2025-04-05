import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Strategy } from "@/core";

interface AiStrategyState {
  strategy: Strategy | null;
  isLoading: boolean;
  error: string | null;
  setStrategy: (strategy: Strategy | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAiStrategyStore = create<AiStrategyState>()(
  persist(
    (set) => ({
      strategy: null,
      isLoading: false,
      error: null,
      setStrategy: (strategy) => set({ strategy }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: "ai-strategy-storage",
      partialize: (state) => ({ strategy: state.strategy }),
    }
  )
);
