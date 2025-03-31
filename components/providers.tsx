"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { mainnet } from "viem/chains";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { mergeNetworks } from "@dynamic-labs/sdk-react-core";

const zetaMainnet = {
  blockExplorerUrls: ["https://explorer.zetachain.com/"],
  chainId: 7000,
  chainName: "ZetaChain Mainnet",
  iconUrls: ["https://app.dynamic.xyz/assets/networks/eth.svg"],
  name: "ZetaChain",
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

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
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
          evmNetworks: (networks) => mergeNetworks([zetaMainnet], networks),
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
