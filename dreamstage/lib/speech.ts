export class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private isAwake = false;
  private onWakeWordDetected: () => void;
  private onPhraseDetected: (phrase: string) => void;

  constructor(onWakeWordDetected: () => void, onPhraseDetected: (phrase: string) => void) {
    this.onWakeWordDetected = onWakeWordDetected;
    this.onPhraseDetected = onPhraseDetected;

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false; // Only trigger on final phrases for stability
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript.trim();
              const lowerTranscript = transcript.toLowerCase();
              console.log('Detected phrase:', transcript);

              if (!this.isAwake) {
                // Listening for wake word
                if (lowerTranscript.includes('hi dream') || lowerTranscript.includes('hello dream')) {
                  this.isAwake = true;
                  this.onWakeWordDetected();

                  // Check if there's more to the phrase after the wake word (e.g. "Hi dream how are you")
                  const split = lowerTranscript.split(/hi dream|hello dream/);
                  const remaining = split[1]?.trim();
                  if (remaining) {
                      this.onPhraseDetected(remaining);
                  }
                }
              } else {
                // We are awake, so listen for dismiss or normal phrases
                if (lowerTranscript.includes('bye dream') || lowerTranscript.includes('goodbye dream') || lowerTranscript.includes('dismiss characters')) {
                    this.isAwake = false;
                    this.onPhraseDetected("BYE_COMMAND"); // Special signal to dismiss
                } else if (transcript.length > 2) {
                    this.onPhraseDetected(transcript);
                }
              }
            }
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
        };

        this.recognition.onend = () => {
          // Auto-restart if it was supposed to be listening
          if (this.isListening) {
             try {
                this.recognition.start();
             } catch(e) {}
          }
        };
      } else {
        console.warn('SpeechRecognition API not supported in this browser.');
      }
    }
  }

  setAwakeState(state: boolean) {
      this.isAwake = state;
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
    }
  }

  getIsListening() {
      return this.isListening;
  }
}
