"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { SpeechService } from '@/lib/speech';
import { ttsService } from '@/lib/tts';
import { Mic, MicOff, UserX, MessageSquare, Play, Loader2, Hand, VideoOff } from 'lucide-react';
import { GestureService } from '@/lib/gesture';
import { YouTubeChat } from './YouTubeChat';

export default function ControlPage() {
  const showCharacters = useCharacterStore((state) => state.showCharacters);
  const hideCharacters = useCharacterStore((state) => state.hideCharacters);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [transcriptLog, setTranscriptLog] = useState<string[]>([]);
  const speechServiceRef = useRef<SpeechService | null>(null);
  const gestureServiceRef = useRef<GestureService | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const playCharacterSpeech = useCallback((character: 'dream' | 'sidekick', text: string) => {
      ttsService.speak(
          text,
          character,
          () => updateCharacter(character, { isSpeaking: true, text }), // onStart
          () => updateCharacter(character, { isSpeaking: false })      // onEnd
      );
  }, [updateCharacter]);

  const simulateGreeting = useCallback(() => {
      // We can now just queue them up and the native TTS queue handles it
      playCharacterSpeech('dream', 'Hello! I am Dream. How can I help you today?');
      playCharacterSpeech('sidekick', 'And I am the sarcastic one. Try not to bore us.');
  }, [playCharacterSpeech]);

  const handlePhraseDetected = useCallback(async (phrase: string) => {
      if (phrase === 'BYE_COMMAND') {
          ttsService.stop();
          hideCharacters();
          return;
      }

      setTranscriptLog(prev => [...prev, `You: ${phrase}`]);
      setIsProcessing(true);

      try {
          const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: phrase })
          });

          if (!response.ok) throw new Error('API error');
          if (!response.body) return;

          // Process the streaming response
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              fullText += decoder.decode(value, { stream: true });
          }

          setIsProcessing(false);

          // The LLM returns format:
          // Dream: [text]
          // Sidekick: [text]
          const lines = fullText.split('\n').filter(line => line.trim().length > 0);

          let dreamText = '';
          let sidekickText = '';

          lines.forEach(line => {
              if (line.startsWith('Dream:')) {
                  dreamText = line.replace('Dream:', '').trim();
              } else if (line.startsWith('Sidekick:')) {
                  sidekickText = line.replace('Sidekick:', '').trim();
              }
          });

          // Simply queue them sequentially using the native speech synthesis queue
          if (dreamText) {
              playCharacterSpeech('dream', dreamText);
              setTranscriptLog(prev => [...prev, `Dream: ${dreamText}`]);
          }
          if (sidekickText) {
              playCharacterSpeech('sidekick', sidekickText);
              setTranscriptLog(prev => [...prev, `Sidekick: ${sidekickText}`]);
          }

      } catch (error) {
          console.error("Failed to fetch chat response:", error);
          setIsProcessing(false);
      }
  }, [hideCharacters, playCharacterSpeech]);

  useEffect(() => {
    speechServiceRef.current = new SpeechService(
      () => {
        showCharacters();
        simulateGreeting();
      },
      (phrase) => {
        handlePhraseDetected(phrase);
      }
    );

    gestureServiceRef.current = new GestureService();

    return () => {
      if (speechServiceRef.current) {
        speechServiceRef.current.stopListening();
      }
      if (gestureServiceRef.current) {
          gestureServiceRef.current.stopTracking();
      }
      ttsService.stop();
    };
  }, [showCharacters, simulateGreeting, handlePhraseDetected]);

  const toggleCamera = async () => {
      if (!gestureServiceRef.current || !videoRef.current) return;

      if (isCameraActive) {
          gestureServiceRef.current.stopTracking();
          setIsCameraActive(false);
      } else {
          try {
              await gestureServiceRef.current.initialize(videoRef.current);
              gestureServiceRef.current.startTracking();
              setIsCameraActive(true);
          } catch (e) {
              console.error("Could not start camera:", e);
          }
      }
  };

  const toggleListening = () => {
    if (!speechServiceRef.current) return;

    if (isListening) {
      speechServiceRef.current.stopListening();
      setIsListening(false);
    } else {
      speechServiceRef.current.startListening();
      setIsListening(true);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <header className="flex justify-between items-center border-b border-neutral-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              DreamStage Control
            </h1>
            <p className="text-neutral-400">Phase 2: LLM Conversation & TTS</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={toggleCamera}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isCameraActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-neutral-700 hover:bg-neutral-600'
              }`}
            >
              {isCameraActive ? <VideoOff size={20} /> : <Hand size={20} />}
              {isCameraActive ? 'Stop Hands' : 'Track Hands'}
            </button>
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              {isListening ? 'Stop Listening' : 'Start Mic (Wake Word)'}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls & Log */}
          <div className="space-y-6">
              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Hand className="text-orange-400" />
                  Camera (Hand Tracking)
                </h2>
                <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700 relative">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover scale-x-[-1]"
                        playsInline
                        muted
                    />
                    {!isCameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
                            Camera inactive. Click &quot;Track Hands&quot; to start.
                        </div>
                    )}
                </div>
              </div>

              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="text-blue-400" />
                  Manual Triggers
                </h2>
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      if (speechServiceRef.current) speechServiceRef.current.setAwakeState(true);
                      showCharacters();
                      simulateGreeting();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 px-4 py-3 rounded-lg transition-colors"
                  >
                    <Play size={18} />
                    Trigger &quot;Hi Dream&quot; Sequence
                  </button>

                  <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message to test LLM..."
                        className="flex-1 bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                                if (speechServiceRef.current) speechServiceRef.current.setAwakeState(true);
                                showCharacters();
                                handlePhraseDetected(e.currentTarget.value);
                                e.currentTarget.value = '';
                            }
                        }}
                      />
                  </div>

                  <button
                    onClick={() => {
                        if (speechServiceRef.current) speechServiceRef.current.setAwakeState(false);
                        handlePhraseDetected('BYE_COMMAND');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-700 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-neutral-600 hover:border-red-500/50 px-4 py-3 rounded-lg transition-colors"
                  >
                    <UserX size={18} />
                    Dismiss Characters
                  </button>
                </div>
              </div>

              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 h-64 flex flex-col">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  Conversation Log
                  {isProcessing && <Loader2 className="animate-spin text-blue-400" size={16} />}
                </h2>
                <div className="flex-1 overflow-y-auto space-y-2 text-sm text-neutral-300 bg-neutral-900/50 p-3 rounded">
                    {transcriptLog.length === 0 ? (
                        <span className="text-neutral-500 italic">No conversation yet...</span>
                    ) : (
                        transcriptLog.map((log, i) => (
                            <div key={i} className="border-b border-neutral-800 pb-1">
                                {log}
                            </div>
                        ))
                    )}
                </div>
              </div>
          </div>

          {/* Third Column area: Live Chat */}
          <div className="space-y-6">
              <YouTubeChat />

              {/* Status Panel */}
              <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
                <h2 className="text-xl font-semibold mb-4">System Status</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-2 rounded bg-neutral-900/50">
                    <span className="text-neutral-400">Microphone</span>
                    <span className={isListening ? 'text-green-400' : 'text-neutral-500'}>
                      {isListening ? 'Active (Listening...)' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-neutral-900/50">
                    <span className="text-neutral-400">Sync Bus</span>
                    <span className="text-green-400">Connected (Broadcast & SSE)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-neutral-900/50">
                    <span className="text-neutral-400">LLM Connection</span>
                    <span className={isProcessing ? "text-yellow-400" : "text-green-400"}>
                        {isProcessing ? 'Thinking...' : 'Ready'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-neutral-900/50">
                    <span className="text-neutral-400">Stage Link</span>
                    <a href="/stage" target="_blank" className="text-blue-400 hover:underline">
                      Open Stage in New Tab ↗
                    </a>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg text-sm text-blue-200">
                  <strong>Tip:</strong> Open the Stage link. Click &quot;Start Mic&quot; and say &quot;Hi Dream&quot;. Once they appear, talk to them normally. When done, say &quot;Bye Dream&quot; to dismiss them. You can also type text in the manual trigger input to test without a microphone.
                </div>
              </div>
          </div>
        </section>

      </div>
    </main>
  );
}
