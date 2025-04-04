import { Asset, getStrategy, Price, supportedAssets } from "@/core";
import { BalanceData } from "@/lib/handlers/balances";
import { buildInputItems, calculateUsdAllocation, buildDesiredAllocations } from "@/core/rebalance";

describe("buildInputItems", () => {
    // ARRANGE
    // Given some mocked data
    // comes from assets.json
    const supportedAssets: Asset[] = [
        {
            chainId: "7000",
            canonical: "ZETA",
            zrc20: "",
            asset: "",
            decimals: 18,
            name: "ZetaChain",
            symbol: "ZETA",
            coinType: "Gas",
            pythPriceId: "0x123"
        },
        {
            chainId: "421614",
            canonical: "ETH",
            zrc20: "0x1de70f3e971B62A0707dA18100392af14f7fB677",
            asset: "",
            decimals: 18,
            name: "ZetaChain ZRC20 Arbitrum Sepolia ETH",
            symbol: "ETH.ARBSEP",
            coinType: "Gas",
            pythPriceId: "0x111"
        },
        {
            chainId: "8332",
            canonical: "BTC",
            zrc20: "0x13A0c5930C028511Dc02665E7285134B6d11A5f4",
            asset: "",
            decimals: 8,
            name: "ZetaChain ZRC20 BTC-btc_mainnet",
            symbol: "BTC.BTC",
            coinType: "Gas",
            pythPriceId: "0x456"
        }
    ];

    // comes from pyth API
    const prices: Price[] = [
        {
            id: "0x123",
            chainId: "7000",
            canonical: "ZETA",
            publishedAt: new Date(),
            ticker: "ZETA",
            usdRate: 0.292
        },
        {
            id: "0x111",
            chainId: "421614",
            canonical: "ETH",
            publishedAt: new Date(),
            ticker: "ETH.ARBSEP",
            usdRate: 1850,
        },
        {
            id: "0x456",
            chainId: "8332",
            canonical: "BTC",
            publishedAt: new Date(),
            ticker: "BTC.BTC",
            usdRate: 82634.68
        }
    ];

    // comes from zetachain-toolkit
    const tokenBalances: BalanceData[] = [
        {
            chain_id: "7000",
            coin_type: "Gas",
            contract: "",
            decimals: 18,
            symbol: "ZETA",
            chain_name: "zeta_mainnet",
            id: "7000__ZETA",
            ticker: "ZETA",
            balance: "1500"
        },
        {
            chain_id: "8332",
            coin_type: "ZRC20",
            contract: "0x13A0c5930C028511Dc02665E7285134B6d11A5f4",
            decimals: 8,
            symbol: "BTC.BTC",
            chain_name: "btc_mainnet",
            id: "8332__BTC.BTC",
            ticker: "BTC.BTC",
            balance: "0.1"
        },
        {
            chain_id: "421614",
            coin_type: "Gas",
            contract: "",
            decimals: 18,
            symbol: "ETH.ARBSEP",
            chain_name: "arbitrum_sepolia",
            id: "421614__ETH.ARBSEP",
            ticker: "ETH.ARBSEP",
            balance: "0"
        }
    ];

    it("valid", () => {
        // ACT
        const { inputItems: result, logs } = buildInputItems(supportedAssets, prices, tokenBalances);

        // ASSERT
        expect(logs).toHaveLength(0);

        // 2 instead of 3 because ETH.ARBSEP has no balance
        expect(result).toHaveLength(2);

        // Check first element is BTC (it has the highest USD value)
        expect(result[0].asset.symbol).toBe("BTC.BTC");
        expect(result[0].asset.chainId).toBe("8332");
        expect(result[0].balance.balance).toBe("0.1");
        expect(result[0].price.usdRate).toBe(82634.68);
        expect(result[0].id).toBe("8332:BTC");

        // Check second element is ZETA
        expect(result[1].asset.symbol).toBe("ZETA");
        expect(result[1].asset.chainId).toBe("7000");
        expect(result[1].balance.balance).toBe("1500");
        expect(result[1].price.usdRate).toBe(0.292);
        expect(result[1].id).toBe("7000:ZETA");
    });

    it("should throw error when asset not found for balance", () => {
        // ARRANGE
        const invalidBalance: BalanceData = {
            chain_id: "9999",
            coin_type: "Gas",
            contract: "",
            decimals: 18,
            symbol: "INVALID",
            chain_name: "invalid_chain",
            id: "9999__INVALID",
            ticker: "INVALID",
            balance: "1000"
        };

        // ACT
        const { inputItems, logs } = buildInputItems(supportedAssets, prices, [invalidBalance]);

        // ASSERT
        expect(inputItems).toHaveLength(0);
        expect(logs).toEqual(["Asset not found for balance 9999__INVALID. Skipped"])
    });
});

describe("calculateUsdAllocation", () => {
    const PERCENTAGE = "percentage" as const;
    const USD_VALUE = "usd_value" as const;

    // $10k
    const totalUsdValue = 10_000;

    const testCases = [
        {
            name: "should calculate correct USD value for percentage allocation",
            allocation: { type: PERCENTAGE, percentage: 32 },
            totalUsdValue,
            expected: 3200,
        },
        {
            name: "should return same value for USD allocation",
            allocation: { type: USD_VALUE, usdValue: 2400 },
            totalUsdValue,
            expected: 2400,
        },
        {
            name: "should throw error when percentage is undefined",
            allocation: { type: PERCENTAGE, percentage: undefined },
            totalUsdValue,
            error: "Invalid allocation percentage"
        },
        {
            name: "should throw error when percentage is negative",
            allocation: { type: PERCENTAGE, percentage: -10 },
            totalUsdValue,
            error: "Invalid allocation percentage"
        },
        {
            name: "should throw error when percentage is over 100",
            allocation: { type: PERCENTAGE, percentage: 101 },
            totalUsdValue,
            error: "Invalid allocation percentage"
        },
        {
            name: "should throw error when usdValue is undefined",
            allocation: { type: USD_VALUE, usdValue: undefined },
            totalUsdValue,
            error: "Invalid allocation usd value"
        },
        {
            name: "should throw error when usdValue is negative",
            allocation: { type: USD_VALUE, usdValue: -1000 },
            totalUsdValue,
            error: "Invalid allocation usd value"
        },
        {
            name: "should throw error when usdValue exceeds total portfolio value",
            allocation: { type: USD_VALUE, usdValue: 15000 },
            totalUsdValue,
            error: "Allocation usd value is greater than total usd value"
        }
    ];

    testCases.forEach(({ name, allocation, totalUsdValue, expected, error: errExpected }) => {
        it(name, () => {
            const act = () => calculateUsdAllocation(allocation, totalUsdValue);

            !errExpected
                ? expect(act()).toBe(expected)
                : expect(act).toThrow(errExpected);
        });
    });
});

describe("buildDesiredAllocations", () => {
    // ARRANGE
    // Given some mocked data
    const strategy = getStrategy("btc-maxi")!;

    // comes from assets.testnet.json
    const assets = supportedAssets(true);

    // Mock prices for each asset
    const BTC_PRICE = 85_000;
    const ETH_PRICE = 2000;
    const SOL_PRICE = 120;

    const prices = assets.map(asset => {
        // 0.2 - 200 usd
        const randomRate = (Math.random() * 199.8 + 0.2).toFixed(1);

        const usdRate = asset.canonical === "BTC" ? BTC_PRICE :
            asset.canonical === "ETH" ? ETH_PRICE :
                asset.canonical === "SOL" ? SOL_PRICE
                    : randomRate;

        return {
            id: asset.pythPriceId,
            chainId: asset.chainId,
            canonical: asset.canonical,
            publishedAt: new Date(),
            ticker: asset.symbol,
            usdRate
        } as Price;
    });

    // Given total desired allocation
    const allocationUsdValue = 2000;

    it("valid", () => {
        // ACT
        const result = buildDesiredAllocations(
            strategy.definitions,
            assets,
            prices,
            allocationUsdValue,
        );

        // ASSERT
        // (3) BTC, ETH, SOL
        expect(result).toHaveLength(strategy.definitions.length);

        // Check BTC allocation (50%)
        expect(result[0].asset.symbol).toBe("sBTC");
        expect(result[0].usdValue).toBe(1800); // 90% of 2000
        expect(result[0].tokenValue()).toBe(1800 / BTC_PRICE);

        // Check ETH allocation (30%)
        expect(result[1].asset.symbol).toBe("sETH.SEPOLIA");
        expect(result[1].usdValue).toBe(200); // 10% of 2000
        expect(result[1].tokenValue()).toBe(200 / ETH_PRICE);
    });

    it("should throw error when asset not found for distribution", () => {
        // ARRANGE
        const invalidDistribution = { percentage: 5000, asset: "INVALID" };

        // ACT
        const act = () => {
            buildDesiredAllocations(
                [invalidDistribution],
                assets,
                prices,
                allocationUsdValue
            )
        }

        // ASSERT
        expect(act).toThrow("Asset not found for distribution");
    });
});

