import { Anthropic } from '@anthropic-ai/sdk';

export const client = defaultClient();

function defaultClient() {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
        throw new Error('CLAUDE_API_KEY is not set');
    }

    return new Anthropic({
        apiKey,
    });
}
