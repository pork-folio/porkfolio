import { rebalance, RebalanceInput } from "@/core/rebalance/rebalance";


describe("rebalance", () => {
    it("should rebalance", async () => {
        // ARRANGE
        // Download input from Github
        const url = 'https://gist.githubusercontent.com/fadeev/dc43b7d3b3aebf2f9197f9e1a2dab9d8/raw/f0832bdcfc0a21b0833f4d695ba7ea504cffa3de/file.json'
        const response = await fetch(url);
        const portfolio = await response.json();
        const rebalanceInput = portfolio as RebalanceInput;

        // ACT
        const result = rebalance(rebalanceInput);

        // ASSERT
        expect(result).toBeDefined();
        expect(result.valid).toBe(true);
        expect(result.actions.length).toBeGreaterThan(0);
        expect(result.logs.length).toBeGreaterThan(0);
    })
})