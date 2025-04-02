import { create } from "zustand";

export interface Chain {
  chain_id: string;
  chain_name: string;
  network: string;
  network_type: string;
  vm: string;
  consensus: string;
  is_external: boolean;
  cctx_gateway: string;
  name: string;
}

interface ChainsState {
  chains: Chain[];
  isLoading: boolean;
  error: string | null;
  fetchChains: (isTestnet: boolean) => Promise<void>;
}

export const useChainsStore = create<ChainsState>((set) => ({
  chains: [],
  isLoading: false,
  error: null,
  fetchChains: async (isTestnet: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const baseUrl = isTestnet
        ? "https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/observer/supportedChains"
        : "https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/observer/supportedChains";

      const response = await fetch(baseUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch supported chains");
      }
      const data = await response.json();
      set({ chains: data.chains, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch chains",
        isLoading: false,
      });
    }
  },
}));
