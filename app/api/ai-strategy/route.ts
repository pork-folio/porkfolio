import { client } from "@/core/ai/client";
import { PromptInput, generateStrategy } from "@/core/ai/strategy";

// todo rate limiter

// "POST api/ai-strategy"
export async function POST(request: Request) {
    // Cast request. Who cares about data validation during the hackathon? :)
    const input: PromptInput = await request.json();

    try {
        const strategy = await generateStrategy(client, input);
        return jsonResponse(200, { strategy });
    } catch (error) {
        console.log("Error generating strategy", error);

        return jsonResponse(500, { error: "Error generating strategy" });
    };
}

function jsonResponse(code: number, data: object) {
    const headers = {
        'Content-Type': 'application/json',
    }

    return new Response(JSON.stringify(data), { status: code, headers });
}
