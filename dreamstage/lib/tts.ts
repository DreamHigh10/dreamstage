export interface TTSConfig {
  character: 'dream' | 'sidekick';
  pitch: number;
  rate: number;
  voiceNameSubstring?: string; // Optional: try to find a voice containing this string
}

export class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  // Default configurations if specific voices aren't found
  private configs: Record<'dream' | 'sidekick', TTSConfig> = {
    dream: {
      character: 'dream',
      pitch: 1.2, // Slightly higher pitched, cheerful
      rate: 1.1,
      voiceNameSubstring: 'Female',
    },
    sidekick: {
      character: 'sidekick',
      pitch: 0.8, // Lower pitched, sarcastic
      rate: 0.95,
      voiceNameSubstring: 'Male',
    }
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.loadVoices();

      // Some browsers load voices asynchronously
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = this.loadVoices.bind(this);
      }
    }
  }

  private loadVoices() {
    if (this.synth) {
      this.voices = this.synth.getVoices();
    }
  }

  private getVoice(config: TTSConfig): SpeechSynthesisVoice | null {
    if (!this.voices.length) return null;

    // First try to find a voice matching the substring (e.g. Google UK English Female)
    if (config.voiceNameSubstring) {
      const match = this.voices.find(v =>
        v.name.toLowerCase().includes(config.voiceNameSubstring!.toLowerCase()) &&
        v.lang.startsWith('en')
      );
      if (match) return match;
    }

    // Fallback: Just get the first English voice
    return this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
  }

  speak(text: string, character: 'dream' | 'sidekick', onStart?: () => void, onEnd?: () => void) {
    if (!this.synth || text === '') {
        if (onEnd) onEnd();
        return;
    }

    // REMOVED: this.synth.cancel();
    // We want to rely on the browser's native queue so they speak sequentially without cutting each other off.

    const config = this.configs[character];
    const utterance = new SpeechSynthesisUtterance(text);

    const voice = this.getVoice(config);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.pitch = config.pitch;
    utterance.rate = config.rate;

    utterance.onstart = () => {
        if (onStart) onStart();
    };

    utterance.onend = () => {
        if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        if (onEnd) onEnd(); // Ensure UI state resets even on error
    };

    this.synth.speak(utterance);
  }

  stop() {
      if (this.synth) {
          this.synth.cancel();
      }
  }
}

// Export a singleton instance
export const ttsService = new TTSService();
