import { NextResponse } from 'next/server';
import { SyncEvent } from '@/lib/sync';

export const dynamic = 'force-dynamic';

// In-memory state for simple syncing across different browser instances (e.g. Chrome to OBS CEF).
// Note: This only works on a single Node.js instance (good for local dev).
let clients: ReadableStreamDefaultController[] = [];

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.push(controller);
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: {"type": "CONNECTED"}\n\n'));
    },
    cancel(controller) {
      clients = clients.filter((c) => c !== controller);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(req: Request) {
  try {
    const event: SyncEvent = await req.json();

    // Broadcast to all connected SSE clients
    const encoder = new TextEncoder();
    const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    clients.forEach((client) => {
      try {
        client.enqueue(data);
      } catch (e) {
        // Client might be disconnected
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process event' }, { status: 400 });
  }
}
