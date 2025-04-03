import { rebalance, RebalanceInput } from "@/core/rebalance/rebalance";
import * as fs from 'fs';
import * as path from 'path';

describe("rebalance", () => {
    const loadTestData = (filename: string): string => {
        const testDataPath = path.join(__dirname, 'testdata', filename);
        return fs.readFileSync(testDataPath, 'utf-8');
    }

    const loadInput = (filename: string): RebalanceInput => {
        const raw = loadTestData(filename);
        return JSON.parse(raw) as RebalanceInput;
    }

    it("01rebalance-meme-master", async () => {
        // ARRANGE
        // Load input from local testdata directory
        const rebalanceInput = loadInput('01rebalance.json');

        // ACT
        const act = () => rebalance(rebalanceInput);

        // ASSERT
        expect(act).toThrow('Asset not found for distribution SHIB');
    });
});