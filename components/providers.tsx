"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { Chain } from "viem/chains";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { mergeNetworks } from "@dynamic-labs/sdk-react-core";

const zetaTestnetChain: Chain = {
  id: 7001,
  name: "ZetaChain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "ZETA",
    symbol: "ZETA",
  },
  rpcUrls: {
    default: {
      http: ["https://zetachain-athens.g.allthatnode.com/archive/evm"],
    },
  },
  blockExplorers: {
    default: {
      name: "ZetaChain Testnet Explorer",
      url: "https://athens.explorer.zetachain.com/",
    },
  },
  testnet: true,
};

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

const config = createConfig({
  chains: [zetaTestnetChain],
  transports: {
    [zetaTestnetChain.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: "eaec6949-d524-40e7-81d2-80113243499a",
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          evmNetworks: (networks) => mergeNetworks([zetaTestnet], networks),
        },
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
