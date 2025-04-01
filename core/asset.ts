import assetsData from './data/foreignAssets.json';

type Asset = {
    zrc20: string;
    asset: string;
    chainId: string;
    decimals: number;
    name: string;
    symbol: string;
    coinType: string;
}

const zetaCoin: Asset = {
    zrc20: "",
    asset: "",
    chainId: "7000",
    decimals: 18,
    name: "ZetaChain ZETA",
    symbol: "ZETA",
    coinType: "Gas",
}

export function supportedAssets(): Asset[] {
    // zetacored query fungible list-foreign-coins --output json | jq '.foreignCoins' | pbcopy
    let assets = assetsData.map(parseAsset);

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
    }
}