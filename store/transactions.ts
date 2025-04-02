import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TransactionType = "deposit" | "withdraw";
export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "Initiated";

export interface TokenInfo {
  symbol: string;
  chainName: string;
  contract?: string;
  chainId: string;
  coin_type: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  tokenSymbol: string;
  chainName: string;
  amount: string;
  status: TransactionStatus;
  hash: string;
  timestamp: number;
  sourceToken?: TokenInfo;
  targetToken?: TokenInfo;
}

interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => void;
  updateTransactionStatus: (hash: string, status: TransactionStatus) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set) => ({
      transactions: [],
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [
            {
              ...transaction,
              status: "Initiated",
              id: Math.random().toString(36).substring(7),
              timestamp: Date.now(),
            },
            ...state.transactions,
          ],
        })),
      updateTransactionStatus: (hash, status) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.hash === hash ? { ...tx, status } : tx
          ),
        })),
      clearTransactions: () => set({ transactions: [] }),
    }),
    {
      name: "transactions-storage",
    }
  )
);
