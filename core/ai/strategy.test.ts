import { buildStrategyPrompt, PromptInput } from "@/core/ai/strategy";
import * as fs from 'fs';
import * as path from 'path';

const loadTestData = (filename: string): string => {
    const testDataPath = path.join(__dirname, '../rebalance/testdata', filename);
    return fs.readFileSync(testDataPath, 'utf-8');
}

const loadInput = (filename: string): PromptInput => {
    const raw = loadTestData(filename);

    return JSON.parse(raw) as PromptInput;
}

describe('buildStrategyPrompt', () => {
    it('works', () => {

        // ARRANGE
        const input = loadInput('01rebalance.json');

        // ACT
        const result = buildStrategyPrompt(input);

        // ASSERT
        expect(result).toBeDefined();
        expect(result.systemPrompt).toBeDefined();
        expect(result.userPrompt).toBeDefined();
        expect(result.strategyTool).toBeDefined();

        console.log("System prompt", result.systemPrompt);
        console.log("User prompt", result.userPrompt);
        console.log("Strategy tool", JSON.stringify(result.strategyTool, null, 2));
    })
})