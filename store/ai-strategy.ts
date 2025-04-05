import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Strategy } from "@/core";

interface AiStrategyState {
  strategy: Strategy | null;
  isLoading: boolean;
  error: string | null;
  refreshTrigger: number;
  setStrategy: (strategy: Strategy | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  refreshStrategy: () => void;
}

export const useAiStrategyStore = create<AiStrategyState>()(
  persist(
    (set, get) => ({
      strategy: null,
      isLoading: false,
      error: null,
      refreshTrigger: 0,
      setStrategy: (strategy) => set({ strategy, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      refreshStrategy: () => {
        const currentStrategy = get().strategy;
        if (currentStrategy) {
          set((state) => ({
            isLoading: true,
            refreshTrigger: state.refreshTrigger + 1,
          }));
        }
      },
    }),
    {
      name: "ai-strategy-storage",
      partialize: (state) => ({ strategy: state.strategy }),
    }
  )
);
