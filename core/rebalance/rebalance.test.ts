import { rebalance, RebalanceInput } from "@/core/rebalance/rebalance";


describe("rebalance", () => {
    it("should rebalance", async () => {
        // ARRANGE
        // Download input from Github
        const url = 'https://gist.githubusercontent.com/swift1337/d11abdc6b00eb5213bbe92be3e1b5e88/raw/c43cd0e47c3ef18d62d1daa6d9c11ec1351c332a/rebalance.json'
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

        console.log("Result logs", result.logs);
    })
})