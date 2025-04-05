export const API_BASE_URLS = {
  mainnet: "https://zetachain.blockpi.network",
  testnet: "https://zetachain-athens.blockpi.network",
} as const;

export const EVM_RPC_URLS = {
  mainnet: "https://zetachain-evm.blockpi.network",
  testnet: "https://zetachain-athens-evm.blockpi.network",
} as const;

export const API_ENDPOINTS = {
  TRANSACTION_STATUS:
    "/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData",
  SUPPORTED_CHAINS: "/lcd/v1/public/zeta-chain/observer/supportedChains",
} as const;
