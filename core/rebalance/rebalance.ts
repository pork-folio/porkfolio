import { BalanceData } from "@/lib/handlers/balances";
import { Price, Asset } from "@/core";
import { Distribution, Strategy } from "@/core";
import {
    InputItem,
    DesiredUsdAllocation,
    buildInputItems,
    calculateUsdAllocation,
    buildDesiredAllocations
} from "@/core/rebalance/input";
import { determineRebalanceActions } from "@/core/rebalance/engine";

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

    // 5. Now we have everything to calculate the actions
    let out = determineRebalanceActions(inputItems, desiredAllocations);

    out.logs = [...logs, ...out.logs];

    return out;
}

