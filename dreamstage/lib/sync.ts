/**
 * SyncBus handles both local BroadcastChannel (same browser)
 * and Server-Sent Events (cross-browser, like Chrome -> OBS).
 */

export type SyncEvent =
  | { type: 'WAKE_WORD_DETECTED' }
  | { type: 'CHARACTER_STATE_CHANGE'; payload: { character: 'dream' | 'sidekick'; isSpeaking: boolean; text?: string; isVisible: boolean } }
  | { type: 'DISMISS_CHARACTERS' }
  | { type: 'CURSOR_MOVE'; payload: { x: number; y: number; isPinching: boolean } }
  | { type: 'PIN_CARD'; payload: { id: string; author: string; text: string; avatarUrl?: string } }
  | { type: 'UNPIN_CARD' }
  | { type: 'CONNECTED' }; // Internal

class SyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: ((event: SyncEvent) => void)[] = [];
  private eventSource: EventSource | null = null;

  constructor(channelName: string) {
    if (typeof window !== 'undefined') {
      // 1. Setup BroadcastChannel for same-browser
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };

      // 2. Setup SSE for cross-browser (OBS)
      this.setupSSE();
    }
  }

  private setupSSE() {
    this.eventSource = new EventSource('/api/sync');
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SyncEvent;
        if (data.type !== 'CONNECTED') {
          this.notifyListeners(data);
        }
      } catch (e) {
        console.error('Failed to parse SSE event', e);
      }
    };

    this.eventSource.onerror = () => {
      // Reconnect handled automatically by EventSource, but we can log
      console.warn('SSE connection error, retrying...');
    };
  }

  private notifyListeners(event: SyncEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  async emit(event: SyncEvent) {
    // Emit locally via BroadcastChannel for high-frequency events like CURSOR_MOVE
    // to avoid overloading the Next.js dev server with HTTP POST requests.
    if (this.channel) {
      this.channel.postMessage(event);
    }

    // For low-frequency events, send to SSE server for OBS cross-browser compatibility
    if (event.type !== 'CURSOR_MOVE') {
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });
        } catch (e) {
          console.error('Failed to emit sync event to server', e);
        }
    }
  }

  subscribe(listener: (event: SyncEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const syncBus = new SyncBus('dreamstage-sync');
