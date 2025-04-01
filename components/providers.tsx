"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import {
  baseSepolia,
  arbitrumSepolia,
  bscTestnet,
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
import { mergeNetworks } from "@dynamic-labs/sdk-react-core";
import { createContext, useContext, useState } from "react";

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

const amoyTestnet = {
  id: 80001,
  name: "Amoy Testnet",
  network: "amoy",
  nativeCurrency: {
    decimals: 18,
    name: "MATIC",
    symbol: "MATIC",
  },
  rpcUrls: {
    default: { http: ["https://rpc-amoy.polygon.technology"] },
  },
  blockExplorers: {
    default: { name: "PolygonScan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
};

const mainnetConfig = createConfig({
  chains: [base, arbitrum, bsc, avalanche, mainnet, polygon],
  transports: {
    [base.id]: http(),
    [arbitrum.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
  },
});

const testnetConfig = createConfig({
  chains: [
    baseSepolia,
    arbitrumSepolia,
    bscTestnet,
    avalancheFuji,
    zetachainAthensTestnet,
    sepolia,
    amoyTestnet,
  ],
  transports: {
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [bscTestnet.id]: http(),
    [avalancheFuji.id]: http(),
    [zetachainAthensTestnet.id]: http(),
    [sepolia.id]: http(),
    [amoyTestnet.id]: http(),
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

  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
  };

  const dynamicSettings = {
    environmentId: "eaec6949-d524-40e7-81d2-80113243499a",
    walletConnectors: [EthereumWalletConnectors],
    overrides: {
      evmNetworks: (networks: any[]) => {
        const filteredNetworks = networks.filter((network) => {
          const chainId = network.chainId;
          if (isTestnet) {
            return [
              baseSepolia.id,
              arbitrumSepolia.id,
              bscTestnet.id,
              avalancheFuji.id,
              zetachainAthensTestnet.id,
              sepolia.id,
              amoyTestnet.id,
            ].includes(chainId);
          } else {
            return [
              base.id,
              arbitrum.id,
              bsc.id,
              avalanche.id,
              mainnet.id,
              polygon.id,
            ].includes(chainId);
          }
        });

        if (isTestnet) {
          return mergeNetworks([zetaTestnet], filteredNetworks);
        }
        return filteredNetworks;
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
