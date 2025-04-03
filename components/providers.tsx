"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import {
  baseSepolia,
  arbitrumSepolia,
  avalancheFuji,
  zetachainAthensTestnet,
  base,
  arbitrum,
  bsc,
  avalanche,
  sepolia,
  mainnet,
  polygon,
} from "viem/chains";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { mergeNetworks } from "@dynamic-labs/sdk-react-core";
import { createContext, useContext, useState, useEffect } from "react";
import { useChainsStore } from "@/store/chains";
import { ProviderRpcError } from "viem";

const zetaTestnet = {
  blockExplorerUrls: ["https://athens.explorer.zetachain.com/"],
  chainId: 7001,
  chainName: "ZetaChain Testnet",
  iconUrls: ["https://app.dynamic.xyz/assets/networks/eth.svg"],
  name: "ZetaChain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "ZETA",
    symbol: "ZETA",
    iconUrl: "https://app.dynamic.xyz/assets/networks/eth.svg",
  },
  networkId: 7001,
  rpcUrls: ["https://zetachain-athens.g.allthatnode.com/archive/evm"],
  vanityName: "ZetaChain Testnet",
};

const zetaMainnetDynamic = {
  blockExplorerUrls: ["https://explorer.zetachain.com/"],
  chainId: 7000,
  chainName: "ZetaChain Mainnet",
  iconUrls: ["https://app.dynamic.xyz/assets/networks/eth.svg"],
  name: "ZetaChain Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "ZETA",
    symbol: "ZETA",
    iconUrl: "https://app.dynamic.xyz/assets/networks/eth.svg",
  },
  networkId: 7000,
  rpcUrls: ["https://zetachain-mainnet.g.allthatnode.com/archive/evm"],
  vanityName: "ZetaChain Mainnet",
};

const zetaMainnetWagmi = {
  id: 7000,
  name: "ZetaChain Mainnet",
  network: "zetachain",
  nativeCurrency: {
    decimals: 18,
    name: "ZETA",
    symbol: "ZETA",
  },
  rpcUrls: {
    default: {
      http: ["https://zetachain-mainnet.g.allthatnode.com/archive/evm"],
    },
  },
  blockExplorers: {
    default: { name: "ZetaScan", url: "https://explorer.zetachain.com" },
  },
  testnet: false,
};

const amoyTestnetDynamic = {
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
  chainId: 80002,
  chainName: "Polygon Amoy Testnet",
  iconUrls: ["https://app.dynamic.xyz/assets/networks/polygon.svg"],
  name: "Polygon Amoy Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MATIC",
    symbol: "MATIC",
    iconUrl: "https://app.dynamic.xyz/assets/networks/polygon.svg",
  },
  networkId: 80001,
  rpcUrls: ["https://rpc-amoy.polygon.technology"],
  vanityName: "Polygon Amoy Testnet",
};

const bnbTestnetDynamic = {
  blockExplorerUrls: ["https://testnet.bscscan.com/"],
  chainId: 97,
  chainName: "BNB Chain Testnet",
  iconUrls: ["https://app.dynamic.xyz/assets/networks/bnb.svg"],
  name: "BNB Chain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "BNB",
    symbol: "BNB",
    iconUrl: "https://app.dynamic.xyz/assets/networks/bnb.svg",
  },
  networkId: 97,
  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
  vanityName: "BNB Chain Testnet",
};

const amoyTestnetWagmi = {
  id: 80002,
  name: "Polygon Amoy Testnet",
  network: "amoy",
  nativeCurrency: {
    decimals: 18,
    name: "MATIC",
    symbol: "MATIC",
  },
  rpcUrls: {
    default: { http: ["https://polygon-amoy-bor-rpc.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "PolygonScan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
};

const bnbTestnetWagmi = {
  id: 97,
  name: "BNB Chain Testnet",
  network: "bsc-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "BNB",
    symbol: "BNB",
  },
  rpcUrls: {
    default: { http: ["https://data-seed-prebsc-1-s1.binance.org:8545"] },
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://testnet.bscscan.com" },
  },
  testnet: true,
};

const mainnetConfig = createConfig({
  chains: [base, arbitrum, bsc, avalanche, mainnet, polygon, zetaMainnetWagmi],
  transports: {
    [base.id]: http(),
    [arbitrum.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [zetaMainnetWagmi.id]: http(),
  },
});

const testnetConfig = createConfig({
  chains: [
    baseSepolia,
    arbitrumSepolia,
    bnbTestnetWagmi,
    avalancheFuji,
    zetachainAthensTestnet,
    sepolia,
    amoyTestnetWagmi,
  ],
  transports: {
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [bnbTestnetWagmi.id]: http(),
    [avalancheFuji.id]: http(),
    [zetachainAthensTestnet.id]: http(),
    [sepolia.id]: http(),
    [amoyTestnetWagmi.id]: http(),
  },
});

const queryClient = new QueryClient();

const NetworkContext = createContext<{
  isTestnet: boolean;
  toggleNetwork: () => void;
}>({
  isTestnet: true,
  toggleNetwork: () => {},
});

export const useNetwork = () => useContext(NetworkContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [isTestnet, setIsTestnet] = useState(true);
  const config = isTestnet ? testnetConfig : mainnetConfig;
  const fetchChains = useChainsStore((state) => state.fetchChains);

  useEffect(() => {
    fetchChains(isTestnet);
  }, [isTestnet, fetchChains]);

  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
    // Automatically switch to ZetaChain
    const zetaChainId = isTestnet ? 7000 : 7001; // Switch to mainnet ZetaChain when going to mainnet, testnet ZetaChain when going to testnet
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${zetaChainId.toString(16)}` }],
        })
        .catch((error: ProviderRpcError) => {
          // This error code indicates that the chain has not been added to MetaMask
          if (error.code === 4902) {
            console.log("Chain not added to MetaMask");
          }
        });
    }
  };

  const dynamicSettings = {
    environmentId: "eaec6949-d524-40e7-81d2-80113243499a",
    walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
    overrides: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evmNetworks: (networks: any[]) => {
        const filteredNetworks = networks.filter((network) => {
          const chainId = network.chainId;
          if (isTestnet) {
            return [
              baseSepolia.id,
              arbitrumSepolia.id,
              bnbTestnetWagmi.id,
              avalancheFuji.id,
              zetachainAthensTestnet.id,
              sepolia.id,
              amoyTestnetWagmi.id,
            ].includes(chainId);
          } else {
            return [
              base.id,
              arbitrum.id,
              bsc.id,
              avalanche.id,
              mainnet.id,
              polygon.id,
              zetaMainnetWagmi.id,
            ].includes(chainId);
          }
        });

        if (isTestnet) {
          return mergeNetworks(
            [zetaTestnet, amoyTestnetDynamic, bnbTestnetDynamic],
            filteredNetworks
          );
        }
        return mergeNetworks([zetaMainnetDynamic], filteredNetworks);
      },
    },
  };

  return (
    <NetworkContext.Provider value={{ isTestnet, toggleNetwork }}>
      <DynamicContextProvider settings={dynamicSettings}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
          </QueryClientProvider>
        </WagmiProvider>
      </DynamicContextProvider>
    </NetworkContext.Provider>
  );
}
