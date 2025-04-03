import { RebalanceAction, RebalanceOutput } from "@/core/rebalance/rebalance";
import { DesiredUsdAllocation, InputItem } from "@/core/rebalance/input";

type CanonicalInput = {
    canonical: string;
    usdValue: number;
    inputs: InputItem[];
}

// Minimum USD threshold for swaps to avoid dust
// $1 minimum swap
export const MIN_USD_THRESHOLD = 1.0;

// got: `asset+price+balance`, want: `asset+desiredUsdValue`
// The algo operates with a notion of "canonical" assets.
// For example, $50 USDC on Base and $50 USDC on Solana are considered as $100 "canonical" USDC.
export function determineRebalanceActions(got: InputItem[], want: DesiredUsdAllocation[]): RebalanceOutput {
    const logs: string[] = [];
    const actions: RebalanceAction[] = [];

    // 1. Filter out assets with zero value
    logs.push(`Portfolio assets: ${got.map(item => item.asset.symbol).join(", ")}`);

    // 2. Group "canonical" => input items
    const portfolioUsdValues = new Map<string, CanonicalInput>();
    for (const item of got) {
        const canonical = item.asset.canonical;

        const siblings = portfolioUsdValues.get(canonical) || {
            canonical,
            usdValue: 0,
            inputs: [],
        }

        siblings.usdValue += item.usdPrice();
        siblings.inputs.push(item);

        portfolioUsdValues.set(canonical, siblings);
    }

    // Sort inputs by USD value (highest first)
    portfolioUsdValues.forEach(ci => {
        ci.inputs.sort((a, b) => b.usdPrice() - a.usdPrice());

        logs.push(`Portfolio's ${ci.canonical} = $${ci.usdValue} (${ci.inputs.map(i => i.id).join(", ")})`);
    });

    // 3. Convert `want` to targetUsdValues.
    // The algo assumes DesiredUsdAllocation is unique per canonical asset.
    const targetUsdValues = new Map<string, DesiredUsdAllocation>();
    for (const alloc of want) {
        const canonical = alloc.asset.canonical;
        targetUsdValues.set(canonical, alloc);

        logs.push(`Target ${canonical} = $${alloc.usdValue} (${alloc.tokenValue()} ${alloc.asset.symbol})`);
    }

    // 4. Calculate surplus/deficit for the rebalance
    // surplus: assets we can spend
    // deficit: assets we need to buy
    const [surpluses, deficits] = calculateSurplusWithDeficit(portfolioUsdValues, targetUsdValues);

    // Example:
    logs.push(`Surplus: ${surpluses.map(([c, v]) => `${c}: $${v}`).join(", ")}`);
    logs.push(`Deficit: ${deficits.map(([c, v]) => `${c}: $${v}`).join(", ")}`);

    let availableSurpluses = new Map<string, number>();
    surpluses.forEach(([canonical, usdPrice]) => { availableSurpluses.set(canonical, usdPrice); })

    let spentPerAsset = new Map<string, number>();

    for (let i = 0; i < deficits.length; i++) {
        const canonical = deficits[i][0];
        const alloc = targetUsdValues.get(canonical)!;

        let remainingDeficit = deficits[i][1];

        // portfolioItems already sorted by $ DESC
        for (let j = 0; j < got.length; j++) {
            const balance = got[j];
            const balanceCanonical = balance.asset.canonical;
            const balanceId = balance.id;

            if (balanceCanonical === canonical) {
                continue;
            }

            // Amount of surplus we can spend on this asset. Canonical. (eg USDC is "combined" across chains)
            const availableSurplus = availableSurpluses.get(balanceCanonical) || 0;

            // We can't spend this asset anymore OR we can't spend it all
            if (availableSurplus <= 0) {
                continue
            }

            // Amount of surplus we already spent on this concrete chain-specific balance.
            const alreadySpent = spentPerAsset.get(balanceId) || 0;

            // We can't spend this asset anymore. Skip.
            if (alreadySpent >= balance.usdPrice()) {
                continue;
            }

            // Determine swap amount in USD
            const swapAmount = Math.min(
                remainingDeficit,
                availableSurplus,
                balance.usdPrice() - alreadySpent,
            );

            const action: RebalanceAction = {
                type: "swap",

                from: balance.balance,
                fromUsdValue: swapAmount,
                fromTokenValue: swapAmount / balance.price.usdRate,

                to: alloc.asset,
                toPrice: alloc.price,
            }

            actions.push(action);
            logs.push(`Swap $${swapAmount} in ${balance.asset.symbol} for ${canonical}`);


            availableSurpluses.set(balanceCanonical, availableSurplus - swapAmount)
            spentPerAsset.set(balanceId, alreadySpent + swapAmount)

            remainingDeficit -= swapAmount;
            if (remainingDeficit <= 0) {
                break;
            }
        }

        if (remainingDeficit > MIN_USD_THRESHOLD) {
            logs.push(`Warning: remaining deficit: $${remainingDeficit} for ${canonical}`);
        }
    }

    return {
        valid: actions.length > 0,
        uuid: crypto.randomUUID(),
        createdAt: new Date(),
        actions,
        logs
    };
}

function calculateSurplusWithDeficit(
    portfolio: Map<string, CanonicalInput>,
    target: Map<string, DesiredUsdAllocation>,
): [[string, number][], [string, number][]] {
    // Positive delta means we need to BUY (deficit),
    // negative means we *might* SPEND this on other assets (surplus).
    const deltaUsdValues = new Map<string, number>();

    target.forEach((targetData, canonical) => {
        const currentUsdValue = portfolio.get(canonical)?.usdValue || 0;
        const delta = targetData.usdValue - currentUsdValue;

        deltaUsdValues.set(canonical, delta);
    })

    portfolio.forEach((ci, canonical) => {
        // noop
        if (target.has(canonical)) {
            return
        }

        const surplus = -ci.usdValue

        deltaUsdValues.set(canonical, surplus);
    })

    // Now we have a kv list of canonical assets with their deltas, let's
    // collect surplus assets (negative delta) and deficit assets (positive delta)
    const surplusAssets: [string, number][] = [];
    const deficitAssets: [string, number][] = [];

    deltaUsdValues.forEach((delta, canonical) => {
        if (delta < 0) {
            surplusAssets.push([canonical, Math.abs(delta)]);
        } else if (delta > 0) {
            deficitAssets.push([canonical, delta]);
        }
    });

    // Sort surpluses by $ DESC => spend larger surpluses first
    surplusAssets.sort((a, b) => b[1] - a[1]);

    // Sort deficits by $ DESC => fill larger deficits first
    deficitAssets.sort((a, b) => b[1] - a[1]);

    return [surplusAssets, deficitAssets]
}
