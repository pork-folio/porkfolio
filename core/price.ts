import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import { Asset } from "./asset";

export type Price = {
    id: string;
    publishedAt: Date;
    usdRate: number;
    ticker: string;
    canonical: string;
    chainId: string;
}

const apiUrl = "https://hermes.pyth.network"

// https://github.com/pyth-network/pyth-crosschain/tree/main/price_service/client/js
const pythClient = new PriceServiceConnection(apiUrl, {
    priceFeedRequestConfig: { binary: false },
});

/**
 * Queries Pyth network for the latest prices of provided price ids
 * @param priceIds  pyth price ids
 * @returns 
 */
export async function queryAssetPrices(assets: Asset[]): Promise<Price[]> {
    // fetch prices per ticker
    const prices = await queryPrices(
        assets.map(asset => asset.pythPriceId)
    );

    // cache map
    let priceSet = new Map<string, priceItem>();
    for (const price of prices) {
        priceSet.set(price.id, price);
    }

    // for each asset build a Price
    return assets.map(asset => {
        const price = priceSet.get(asset.pythPriceId);

        if (!price) {
            throw new Error(`Price not found for asset ${asset.symbol} (pyth id: ${asset.pythPriceId})`);
        }

        return {
            ...price,
            ticker: asset.symbol,
            canonical: asset.canonical,
            chainId: asset.chainId,
        };
    });

}

type priceItem = {
    id: string;
    publishedAt: Date;
    usdRate: number;
}

async function queryPrices(ids: string[]): Promise<priceItem[]> {
    // ensure ids are unique
    const uniqueIds = [...new Set(ids)];
    const priceItems = await pythClient.getLatestPriceFeeds(uniqueIds);

    return priceItems!.map(item => {
        const id = `0x${item.id}`.toLocaleLowerCase();
        const price = item.getPriceUnchecked();

        return {
            id,
            publishedAt: new Date(price.publishTime * 1000),
            usdRate: price.getPriceAsNumberUnchecked(),
        }
    })
}
