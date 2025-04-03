// Import all strategy JSON files
import strat01 from './data/strategies/strat01.json';
import strat02 from './data/strategies/strat02.json';
import strat03 from './data/strategies/strat03.json';

export interface Strategy {
    id: string
    name: string
    description: string
    sortIndex: number
    tags: string[]
    env: string[]
    definitions: Distribution[]
}

export type Distribution = {
    percentage: number
    asset: string
}

const allStrategies = parseStrategies()

export function getStrategies(testnet: boolean = false): Strategy[] {
    return allStrategies.filter(
        (s: Strategy) => s.env.includes(testnet ? 'testnet' : 'mainnet')
    )
}

export function getStrategy(id: string): Strategy | undefined {
    return allStrategies.find(s => s.id === id)
}

function parseStrategies(): Strategy[] {
    const raw = [strat01, strat02, strat03]

    return raw.map(parseStrategy).sort((a, b) => a.sortIndex - b.sortIndex)
}

function parseStrategy(kv: any): Strategy {
    const strat = {
        id: kv.id,
        name: kv.name,
        description: kv.description,
        sortIndex: kv.sort_index,
        tags: kv.tags,
        env: kv.env,
        definitions: kv.percentage_strategy.map(parseDistribution)
    }

    if (strat.env.length === 0) {
        throw new Error(`Strategy ${strat.name} has no environment`)
    }

    if (strat.definitions.length === 0) {
        throw new Error(`Strategy ${strat.name} has no definitions`)
    }

    // Validate that the sum of all percentages equals 100,00 (100%)
    const sumPercentage = strat.definitions.reduce(
        (sum: number, def: Distribution) => sum + def.percentage, 0,
    );

    if (sumPercentage !== 10000) {
        throw new Error(`Strategy ${strat.name} has invalid total percentage: ${sumPercentage}`);
    }

    return strat
}

function parseDistribution(kv: any): Distribution {
    return {
        percentage: kv.percentage,
        asset: kv.asset
    }
}
