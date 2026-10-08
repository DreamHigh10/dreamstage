import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const systemMessage = `
You are writing dialogue for two AI sidekicks on a live stream:
1. "Dream": cheerful, witty, helpful, and optimistic.
2. "Sidekick": sarcastic, slightly edgy, or a hype-man, but always a good counterpart to Dream.

The streamer will speak to you. You must respond with a short line for Dream, followed by a short line for Sidekick.
Keep replies VERY short (1-2 sentences max per character) to ensure low latency.

Format your response EXACTLY like this:
Dream: [Dream's response here]
Sidekick: [Sidekick's response here]

Do not include any other text, markdown, or actions.
`;

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemMessage,
    prompt: prompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
