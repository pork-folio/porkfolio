import { BalanceData } from "@/lib/handlers/balances";
import { Allocation, Asset, Distribution, Price } from "@/core";


export class InputItem {
    id: string
    balance: BalanceData;
    asset: Asset;
    price: Price;

    constructor(balance: BalanceData, asset: Asset, price: Price) {
        this.balance = balance;
        this.asset = asset;
        this.price = price;
        this.id = `${asset.chainId}:${asset.canonical}`;
    }

    /**
     * Calculates the USD value of the balance
     * @returns USD value of the balance, or 0
     */
    usdPrice(): number {
        const balance = parseFloat(this.balance.balance);
        if (balance === 0) {
            return 0
        }

        return balance * this.price.usdRate;
    }
}

export class DesiredUsdAllocation {
    asset: Asset;
    price: Price;
    usdValue: number;

    constructor(asset: Asset, price: Price, usdValue: number) {
        this.asset = asset;
        this.price = price;
        this.usdValue = usdValue;
    }

    // return allocation in token units
    tokenValue(): number {
        return this.usdValue / this.price.usdRate;
    }
}

/**
 * Combines input intro triplets of (asset, price, balance).
 * Filters out unsupported assets and empty balances.
 * @param supportedAssets Supported assets
 * @param prices Prices
 * @param balances Balances
 * @returns Input items and logs
 */
export function buildInputItems(
    supportedAssets: Asset[],
    prices: Price[],
    balances: BalanceData[],
): { inputItems: InputItem[], logs: string[] } {
    let logs: string[] = [];
    let inputItems: InputItem[] = [];

    // 1. Match supported assets to prices
    const assetPriceMap: [Asset, Price][] = [];

    for (const asset of supportedAssets) {
        const key = `${asset.chainId}:${asset.canonical}`;
        const price = prices.find(
            p => p.chainId === asset.chainId && p.canonical === asset.canonical
        );

        if (!price) {
            throw Error(`Price not found for asset ${key}`);
        }

        assetPriceMap.push([asset, price]);
    }

    // 2. Match balances
    for (const balance of balances) {
        const assetPrice = assetPriceMap.find(
            ([asset, _]) => assetMatchesBalance(asset, balance)
        );

        if (!assetPrice) {
            logs.push(`Asset not found for balance ${balance.id}. Skipped`);
            continue;
        }

        const [asset, price] = assetPrice;

        inputItems.push(new InputItem(balance, asset, price));
    }

    // filter out empty balances
    inputItems = inputItems.filter(item => item.usdPrice() > 0);

    // sort by total user's $ DESC
    inputItems.sort((a, b) => b.usdPrice() - a.usdPrice());

    return { inputItems, logs }
}

// Calculate input allocation to USD value
export function calculateUsdAllocation(alloc: Allocation, totalUsdValue: number): number {
    if (alloc.type === "percentage") {
        const isInvalid = !alloc.percentage || alloc.percentage < 0 || alloc.percentage > 100;
        if (isInvalid) {
            throw Error("Invalid allocation percentage");
        }

        const forcedUsdAllocation: Allocation = {
            type: "usd_value",
            usdValue: totalUsdValue * (alloc.percentage! / 100),
        };

        return calculateUsdAllocation(forcedUsdAllocation, totalUsdValue);
    }

    if (!alloc.usdValue || alloc.usdValue < 0) {
        throw Error("Invalid allocation usd value");
    }

    if (alloc.usdValue > totalUsdValue) {
        throw Error("Allocation usd value is greater than total usd value");
    }

    return alloc.usdValue;
}


// Build desired allocations in $ for each distribution
// Note: currently it picks the FIRST supported asset that matches the distribution
// e.g. it might pick USDC.ETH instead of USDC.BASE.
// todo: think about asset prioritization (we can hard-code .priority in assets.json)
export function buildDesiredAllocations(
    distributions: Distribution[],
    supportedAssets: Asset[],
    prices: Price[],
    allocationUsdValue: number,
): DesiredUsdAllocation[] {
    let canonicalPrices = new Map<string, Price[]>();
    for (let price of prices) {
        const list = canonicalPrices.get(price.canonical)
        if (!list) {
            canonicalPrices.set(price.canonical, [price])
            continue;
        }

        list.push(price)
    }

    // "USDC" => [USDC.ETH, USDC.BASE, ...]
    let canonicalAssets = new Map<string, Asset[]>();
    for (let asset of supportedAssets) {
        const list = canonicalAssets.get(asset.canonical)
        if (!list) {
            canonicalAssets.set(asset.canonical, [asset])
            continue;
        }

        list.push(asset)
    }

    let out: DesiredUsdAllocation[] = [];
    for (let d of distributions) {
        // "USDC" instead of "USDC.ETH"
        const canonical = d.asset;

        const assets = canonicalAssets.get(canonical)
        if (!assets) {
            throw Error(`Asset not found for distribution ${canonical}`);
        }

        const prices = canonicalPrices.get(canonical)
        if (!prices) {
            throw Error(`Prices not found for asset ${canonical}`);
        }

        const asset = assets[0];
        const price = prices[0];

        // .json definition uses percent=[0...10000] where 100,00 is 100% => 1.0
        // so we need to convert it to a percentage
        const usdValue = allocationUsdValue * (d.percentage! / 10_000);

        out.push(new DesiredUsdAllocation(asset, price, usdValue));
    }

    return out;
}


function assetMatchesBalance(asset: Asset, balance: BalanceData): boolean {
    if (balance.coin_type === "Gas") {
        return balance.chain_id == asset.chainId && balance.ticker == asset.symbol;
    }

    if (balance.coin_type === "ERC20") {
        return balance.chain_id === asset.chainId
            && balance.contract.toLowerCase() === asset.asset.toLowerCase();
    }

    if (balance.coin_type === "ZRC20") {
        return balance.contract.toLowerCase() === asset.zrc20.toLowerCase();
    }

    return false
}