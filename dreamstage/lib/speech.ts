export class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private onWakeWordDetected: () => void;

  constructor(onWakeWordDetected: () => void) {
    this.onWakeWordDetected = onWakeWordDetected;

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript.trim().toLowerCase();
              console.log('Detected phrase:', transcript);

              if (transcript.includes('hi dream') || transcript.includes('hello dream')) {
                this.onWakeWordDetected();
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
