import { create } from "zustand";

export type TransactionType = "deposit" | "withdraw";
export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "Initiated";

export interface Transaction {
  id: string;
  type: TransactionType;
  tokenSymbol: string;
  chainName: string;
  amount: string;
  status: TransactionStatus;
  hash: string;
  timestamp: number;
}

interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => void;
  updateTransactionStatus: (hash: string, status: TransactionStatus) => void;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
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
}));
