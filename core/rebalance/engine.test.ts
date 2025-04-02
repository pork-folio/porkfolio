import { Asset } from "@/core";
import { supportedAssets } from "@/core/asset";
import { BalanceData } from "@/lib/handlers/balances";
import { InputItem, DesiredUsdAllocation } from "@/core/rebalance/input";
import { determineRebalanceActions } from "@/core/rebalance/engine";

const assets = supportedAssets(false);

function findAsset(symbol: string): Asset {
    const a = assets.find((a: Asset) => a.symbol === symbol);
    if (!a) {
        throw new Error(`Asset not found: ${symbol}`);
    }

    return a!;
};

describe("determineRebalanceActions", () => {
    it("works with a simple case", () => {
        // ARRANGE
        // got
        const usdcEthAsset = findAsset("USDC.ETH");
        const usdcBaseAsset = findAsset("USDC.BASE");
        const usdcPolAsset = findAsset("USDC.POL");
        const solAsset = findAsset("SOL.SOL");
        const ethAsset = findAsset("ETH.ETH");

        // want
        const btcAsset = findAsset("BTC.BTC");
        const pepeAsset = findAsset("PEPE.ETH");

        const createPrice = (a: Asset, usdRate: number) => ({
            id: "0x123",
            publishedAt: new Date(),
            usdRate: usdRate,
            ticker: a.symbol,
            canonical: a.canonical,
            chainId: a.chainId,
        });

        // Mock the balance data
        const createBalance = (a: Asset, balance: string): BalanceData => ({
            balance,
            chain_id: a.chainId,
            coin_type: a.zrc20 ? "ZRC20" : "Gas",
            contract: a.zrc20,
            decimals: a.decimals,
            symbol: a.symbol,
            chain_name: "foobar",
            id: `${a.chainId}:${a.symbol}`,
            ticker: a.symbol,
        });

        const createInputItem = (a: Asset, balance: string, tokenUsdPrice: number) => {
            const price = createPrice(a, tokenUsdPrice);
            const balanceData = createBalance(a, balance);
            return new InputItem(balanceData, a, price);
        }

        // Create input items (current portfolio)
        // $200 of USDC, ~$115 of ETH, ~$80 of SOL
        const got = [
            createInputItem(usdcEthAsset, "50", 1),
            createInputItem(usdcBaseAsset, "50", 1),
            createInputItem(usdcPolAsset, "100", 1),
            createInputItem(ethAsset, "0.063", 1800),
            createInputItem(solAsset, "0.5", 160),
        ];

        // Create desired allocation
        // 200 BTC, 100 USDC, 80 PEPE
        const want = [
            new DesiredUsdAllocation(btcAsset, createPrice(btcAsset, 85_000), 200),
            new DesiredUsdAllocation(usdcBaseAsset, createPrice(usdcBaseAsset, 1), 100),
            new DesiredUsdAllocation(pepeAsset, createPrice(pepeAsset, 0.01), 80),
        ];

        printInputItems("GOT", got);
        printDesiredUsdAllocations("WANT", want);

        // ACT
        const result = determineRebalanceActions(got, want);

        // ASSERT
        expect(result).toBeDefined();
        expect(result.valid).toBe(true);
        expect(result.actions.length).toBeGreaterThan(0);
        expect(result.logs.length).toBeGreaterThan(0);

        console.log("RESULT LOGS", result.logs);
    });
});


function printInputItems(label: string, items: InputItem[]) {
    const lines = items.map(
        item => `${item.balance.balance} of ${item.asset.symbol} ($${item.usdPrice()})`
    );

    console.log(label, lines);
}

function printDesiredUsdAllocations(label: string, allocations: DesiredUsdAllocation[]) {
    const lines = allocations.map(
        alloc => `${alloc.tokenValue()} of ${alloc.asset.symbol} ($${alloc.usdValue})`
    );

    console.log(label, lines);
}
