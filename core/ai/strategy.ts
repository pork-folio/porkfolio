import { Asset, Price, Strategy } from "@/core"
import { BalanceData } from "@/lib/handlers/balances"
import { buildInputItems } from "@/core/rebalance"
import { Tool } from "@anthropic-ai/sdk/resources/index.mjs"
import Anthropic from "@anthropic-ai/sdk"

export interface PromptInput {
    address: string
    portfolio: BalanceData[]
    prices: Price[]
    supportedAssets: Asset[]
}

// Structured output of the strategy
const strategyDefinition = {
    name: { type: "string", description: "Name of the strategy" },
    description: { type: "string", description: "Description of the strategy" },
    tags: { type: "array", description: "Tags of the strategy" },
    percentage_strategy: {
        type: "array",
        description: "Percentage strategy. Sum of percentages must be 10000 (100%).",
        items: {
            type: "object",
            properties: {
                percentage: { type: "number", description: "Percentage of the strategy" },
                asset: { type: "string", description: "Asset of the strategy" },
            }
        }
    }
}

const strategyTool: Tool = {
    name: "apply_strategy",
    description: "Apply AI-generated strategy to the portfolio",
    input_schema: { type: "object", properties: strategyDefinition }
}

const systemPrompt = `
You are an expert crypto portfolio manager. User provides you:
- List of crypto assets with balance & prices;
- List of available assets with prices to invest/rebalance;

Your task is to come up with lucrative strategy for rebalancing their portfolio.
Sum of percentages must be 10000 (100%). "percentage_strategy[*].asset" field should be "canonical" 
(example: "USDT" instead of "USDT.ETH"). Distribution should include from 2 to 5 assets.
Description should be a POWERFUL yet concise sentence (no more than 10 words).
`.trim();

export function buildStrategyPrompt(input: PromptInput): {
    systemPrompt: string,
    userPrompt: string,
    strategyTool: Tool
} {
    const userPrompt = buildUserPrompt(input).trim();

    return { systemPrompt, userPrompt, strategyTool }
}

export function buildUserPrompt(input: PromptInput): string {
    const { inputItems } = buildInputItems(
        input.supportedAssets,
        input.prices,
        input.portfolio,
    );

    const portfolio = inputItems.map(item => {
        const balance = item.balance.balance
        const usdPrice = item.usdPrice()
        const asset = item.asset.symbol;

        return `${balance} ${asset} (${usdToString(usdPrice)})`
    })

    // USDC -> $1.0, ETH -> $1800, ...
    let canonicalAssets = new Map<string, number>();
    for (const p of input.prices) {
        canonicalAssets.set(p.canonical, p.usdRate)
    }

    const availableForStrategy = Array.from(canonicalAssets.entries()).map(
        ([asset, usdRate]) => `${asset} (${usdToString(usdRate)})`
    )

    return `
        My portfolio ($asset $tokenBalance $usdBalance): ${JSON.stringify(portfolio)}.
        Supported assets for the strategy ($asset $usdRate): ${JSON.stringify(availableForStrategy)}.
        Analyze my portfolio and return your strategy by calling "apply_strategy" tool.
    `
}

export async function generateStrategy(client: Anthropic, input: PromptInput): Promise<Strategy> {
    const { systemPrompt, userPrompt, strategyTool } = buildStrategyPrompt(input);

    const res = await client.messages.create({
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [strategyTool],
        max_tokens: 1000,
        model: "claude-3-7-sonnet-latest",
    })

    const tool = res.content.find((item) => item.type === "tool_use");
    if (!tool) {
        console.error("No tool use found", res);
        throw new Error("No tool use found");
    }

    if (tool.name !== "apply_strategy") {
        console.error("Invalid tool use. Expected 'apply_strategy', got", tool.name);
        throw new Error(`Invalid tool use (${tool.name})`);
    }

    console.log("Claude 'apply_strategy' result", JSON.stringify(tool, null, 2));

    return unknownToStrategy(tool.id, tool.input);
}

function unknownToStrategy(id: string, shape: any): Strategy {
    return {
        id: id,
        sortIndex: 0,
        env: [],
        name: shape.name,
        description: shape.description,
        tags: shape.tags,
        definitions: shape.percentage_strategy,
    }
}

function usdToString(usd: number): string {
    return `$${usd.toFixed(2)}`;
}



