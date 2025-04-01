import { BalanceData } from "@/lib/handlers/balances";
import { Price } from "./price";
import { Asset } from "./asset";
import { Distribution, Strategy } from "./strategy";

export interface Allocation {
    type: "percentage" | "usd_value"
    percentage?: number
    usdValue?: number
}

export interface RebalanceInput {
    portfolio: BalanceData[]
    prices: Price[]
    supportedAssets: Asset[]
    strategy: Strategy
    allocation: Allocation
}

export interface RebalanceOutput {
    valid: boolean
    errorMessage?: string
    uuid: string
    createdAt: Date
    actions: RebalanceAction[]
    logs: string[]
}

export interface RebalanceAction {
    // todo
}

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

class DesiredUsdAllocation {
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
 * Re-balances the portfolio based on the strategy and allocation
 * @param input RebalanceInput
 * @returns RebalanceOutput
 * @throws Validation error if the input is invalid
 */
export function rebalance(input: RebalanceInput): RebalanceOutput {
    let logs: string[] = [];

    // 1. Combine (asset, price, balance)
    const inputItems = buildInputItems(
        input.supportedAssets,
        input.prices,
        input.portfolio,
    );

    // 2. Calculate total portfolio value
    const totalUsdValue = inputItems.reduce((acc, item) => acc + item.usdPrice(), 0);
    logs.push(`Portfolio value: $${totalUsdValue}`);

    // 3. Normalize & validate allocation
    const allocationUsdValue = calculateUsdAllocation(input.allocation, totalUsdValue);
    logs.push(`Desired allocation value: $${allocationUsdValue}`);

    // 4. Calculate desired allocations
    const desiredAllocations = buildDesiredAllocations(
        input.strategy.definitions,
        input.supportedAssets,
        input.prices,
        allocationUsdValue,
    );

    desiredAllocations.forEach((d, idx) => {
        const tokenValue = d.tokenValue()
        const usdValue = d.usdValue
        const tokenSymbol = d.asset.symbol

        logs.push(`Desired allocation #${idx + 1}: ${tokenValue} ${tokenSymbol} ($${usdValue})`);
    });

    // 5. Now we have everything to calculate actions
    // todo

    return {
        valid: true,
        uuid: crypto.randomUUID(),
        createdAt: new Date(),
        actions: [],
        logs: logs
    }
}

export function buildInputItems(
    supportedAssets: Asset[],
    prices: Price[],
    balances: BalanceData[],
): InputItem[] {
    let inputItems: InputItem[] = [];

    // chainId+canonical => asset
    // chainId+externalContract => asset
    // chainId+zrc20 => asset
    let assetsMap = new Map<string, Asset>();
    for (let asset of supportedAssets) {
        const canonicalKey = `${asset.chainId}:${asset.canonical}`;
        const zrc20Key = `${asset.chainId}:${asset.zrc20}`;
        const externalContractKey = asset.coinType === "ERC20"
            ? `${asset.chainId}:${asset.asset}`
            : `${asset.chainId}:gas`;

        assetsMap.set(canonicalKey, asset);
        assetsMap.set(zrc20Key, asset);
        assetsMap.set(externalContractKey, asset);
    }

    // chainId+canonical => price
    let pricesMap = new Map<string, Price>();
    for (let price of prices) {
        const key = `${price.chainId}:${price.canonical}`;
        pricesMap.set(key, price);
    }

    let balancesMap = new Map<string, BalanceData>();
    for (let b of balances) {
        const asset = assetsMap.get(balanceToAssetKey(b));
        if (!asset) {
            throw Error(`Asset not found for balance ${b.id}`);
        }

        const canonicalKey = `${asset.chainId}:${asset.canonical}`;
        balancesMap.set(canonicalKey, b);
    }

    // okay, now we have each entity in a map of "chainId+canonical" => entity,
    // let's build an ultimate map
    for (let asset of supportedAssets) {
        const key = `${asset.chainId}:${asset.canonical}`;

        const balance = balancesMap.get(key);
        if (!balance) {
            throw Error(`Balance not found for asset ${key}`);
        }

        const price = pricesMap.get(key);
        if (!price) {
            throw Error(`Price not found for asset ${key}`);
        }

        inputItems.push(new InputItem(balance, asset, price));
    }

    // now let's sort by price DESC
    inputItems.sort((a, b) => b.usdPrice() - a.usdPrice());

    return inputItems
}


function balanceToAssetKey(b: BalanceData): string {
    if (b.coin_type === "ZRC20" || b.coin_type === "ERC20") {
        return `${b.chain_id}:${b.contract}`;
    }

    if (b.coin_type === "Gas") {
        return `${b.chain_id}:gas`;
    }

    throw Error(`Unsupported coin type: ${b.coin_type} for balance ${b.id}`);
}

// Calculate input allocation to USD value
function calculateUsdAllocation(alloc: Allocation, totalUsdValue: number): number {
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
function buildDesiredAllocations(
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
            throw Error(`Assets not found for distribution ${canonical}`);
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
