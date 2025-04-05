export const API_BASE_URLS = {
  mainnet: "https://zetachain.blockpi.network",
  testnet: "https://zetachain-athens.blockpi.network",
} as const;

export const EVM_RPC_URLS = {
  mainnet: "https://zetachain-evm.blockpi.network",
  testnet: "https://zetachain-athens-evm.blockpi.network",
} as const;

export const UNIVERSAL_SWAP_ADDRESSES = {
  mainnet: "0x436791ce3490213f64426449863fA9f43B4B4b54",
  testnet: "0x0cf3e61a95137172bb064C209a12e31003a23B8B",
} as const;

export const UNIVERSAL_TOKEN_OINK_ADDRESSES = {
  mainnet: "0x965C393f72b0902b0119C34fdabff6cD02f32469",
  testnet: "0xF14773cc4bF0c5aeA0e50d14E00a5d266267f4A6",
} as const;

export const API_ENDPOINTS = {
  TRANSACTION_STATUS:
    "/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData",
  SUPPORTED_CHAINS: "/lcd/v1/public/zeta-chain/observer/supportedChains",
} as const;
