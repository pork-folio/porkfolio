import assetsMainnet from './data/assets.json';
import assetsTestnet from './data/assets.testnet.json';

export type Asset = {
    zrc20: string;
    asset: string;
    chainId: string;
    decimals: number;
    name: string;
    symbol: string;
    coinType: string;
    pythPriceId: string;
}

const zetaCoin: Asset = {
    zrc20: "",
    asset: "",
    chainId: "7000",
    decimals: 18,
    name: "ZetaChain ZETA",
    symbol: "ZETA",
    coinType: "Gas",
    pythPriceId: "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe",
}

export function supportedAssets(testnet: boolean = false): Asset[] {
    // zetacored query fungible list-foreign-coins --output json | jq '.foreignCoins' | pbcopy
    // pyth price id can be found here: https://www.pyth.network/developers/price-feed-ids
    // Note: it doesn't include [ULTI, NPC] as they have no Pyth oracle
    const rawAssets = testnet ? assetsTestnet : assetsMainnet;

    let assets = rawAssets.map(parseAsset);

    assets.push(zetaCoin)

    return assets;
}

function parseAsset(item: any): Asset {
    return {
        zrc20: item.zrc20_contract_address,
        asset: item.asset,
        chainId: item.foreign_chain_id,
        decimals: item.decimals,
        name: item.name,
        symbol: item.symbol,
        coinType: item.coin_type,
        pythPriceId: item.pyth_price_id,
    }
}