import assetsMainnet from './data/assets.json';
import assetsTestnet from './data/assets.testnet.json';

export type Asset = {
    zrc20: string;
    asset: string;
    chainId: string;
    decimals: number;
    name: string;
    symbol: string;
    coinType: "ERC20" | "Gas";
    pythPriceId: string;
    canonical: string;
}

export function supportedAssets(testnet: boolean = false): Asset[] {
    // zetacored query fungible list-foreign-coins --output json | jq '.foreignCoins' | pbcopy
    // pyth price id can be found here: https://www.pyth.network/developers/price-feed-ids
    // Note: it doesn't include [ULTI, NPC] as they have no Pyth oracle
    // 
    // Also, this list includes zeta gas as well as wZeta
    const rawAssets = testnet ? assetsTestnet : assetsMainnet;

    let assets = rawAssets.map(parseAsset);

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
        canonical: item.canonical,
    }
}