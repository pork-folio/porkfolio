import { create } from "zustand";
import { API_BASE_URLS, API_ENDPOINTS } from "@/lib/constants";

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
        ? `${API_BASE_URLS.testnet}${API_ENDPOINTS.SUPPORTED_CHAINS}`
        : `${API_BASE_URLS.mainnet}${API_ENDPOINTS.SUPPORTED_CHAINS}`;

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
