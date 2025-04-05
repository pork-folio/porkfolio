import { Anthropic } from '@anthropic-ai/sdk';

export const client = defaultClient();

function defaultClient() {
    const apiKey = process.env.CLAUDE_API_KEY;

    return new Anthropic({
        apiKey,
    });
}
