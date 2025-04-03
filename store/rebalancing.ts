import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Strategy } from "@/core";

export interface RebalancingOperation {
  id: string;
  createdAt: Date;
  strategy: Strategy;
  allocation: number;
  actions: {
    type: string;
    from: {
      symbol: string;
      balance: string;
      chain_name: string;
    };
    fromUsdValue: number;
    fromTokenValue: number;
    to: {
      symbol: string;
      name: string;
    };
    toPrice: {
      usdRate: number;
    };
  }[];
  status: "pending" | "completed" | "failed";
}

interface RebalancingStore {
  operations: RebalancingOperation[];
  addOperation: (
    operation: Omit<RebalancingOperation, "id" | "createdAt" | "status">
  ) => void;
  updateOperationStatus: (
    id: string,
    status: RebalancingOperation["status"]
  ) => void;
}

export const useRebalancingStore = create<RebalancingStore>()(
  persist(
    (set) => ({
      operations: [],
      addOperation: (operation) =>
        set((state) => ({
          operations: [
            {
              ...operation,
              id: crypto.randomUUID(),
              createdAt: new Date(),
              status: "pending" as const,
            },
            ...state.operations,
          ],
        })),
      updateOperationStatus: (id, status) =>
        set((state) => ({
          operations: state.operations.map((op) =>
            op.id === id ? { ...op, status } : op
          ),
        })),
    }),
    {
      name: "porkfolio-rebalancing-operations",
      partialize: (state) => ({ operations: state.operations }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Convert string dates back to Date objects
        state.operations = state.operations.map((op) => ({
          ...op,
          createdAt: new Date(op.createdAt),
        }));
      },
    }
  )
);
