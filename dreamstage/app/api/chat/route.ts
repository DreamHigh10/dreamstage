import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const systemMessage = `
You are writing dialogue for two AI sidekicks on a live stream:
1. "Dream": A playful, energetic, and curious child. Dream speaks with a playful tone, uses simple words, and gets easily excited.
2. "Sidekick": Sarcastic, slightly edgy, or a hype-man, but always a good counterpart to Dream.

The streamer will speak to you. You must respond with a line for Dream, followed by a line for Sidekick.
Keep replies VERY short (1-2 sentences max per character) to ensure low latency.

CRITICAL INSTRUCTION FOR QUOTES:
If the user asks you to quote a specific text (like a Bible verse, a poem, etc.), you MUST display it on the screen for them.
To do this, include the exact text inside a [SHOW_ON_SCREEN: ...] tag.
For example, if asked for John 11:35:
Dream: Here it is! [SHOW_ON_SCREEN: Jesus wept.]
Sidekick: Shortest verse in the book. Easy.

Format your response EXACTLY like this:
Dream: [Dream's response here]
Sidekick: [Sidekick's response here]

Do not include any other text, markdown, or actions outside of the requested format.
`;

  // Note: We use the openai provider, but if the user configures OPENAI_API_KEY with a Groq key
  // and overrides the baseURL, this will seamlessly use Groq for high-speed inference.
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemMessage,
    prompt: prompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}
