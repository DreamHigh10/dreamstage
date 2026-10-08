"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { SpeechService } from '@/lib/speech';
import { ttsService } from '@/lib/tts';
import { syncBus } from '@/lib/sync';
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
      // Remove any tags from spoken text
      const spokenText = text.replace(/\[SHOW_ON_SCREEN:.*?\]/g, '').trim();
      if (!spokenText) return;

      ttsService.speak(
          spokenText,
          character,
          () => updateCharacter(character, { isSpeaking: true, text: spokenText }), // onStart
          () => updateCharacter(character, { isSpeaking: false })      // onEnd
      );
  }, [updateCharacter]);

  const simulateGreeting = useCallback(() => {
      // We can now just queue them up and the native TTS queue handles it
      playCharacterSpeech('dream', 'Hello! I am Dream. How can I help you today?');
      playCharacterSpeech('sidekick', 'And I am the sarcastic one. Try not to bore us.');
  }, [playCharacterSpeech]);

  // Helper to parse tags and queue TTS
  const processChunk = useCallback((speaker: 'dream' | 'sidekick', text: string) => {
      // 1. Log it
      setTranscriptLog(prev => [...prev, `${speaker === 'dream' ? 'Dream' : 'Sidekick'}: ${text}`]);

      // 2. Check for [SHOW_ON_SCREEN: ...] tags
      const match = text.match(/\[SHOW_ON_SCREEN:(.*?)\]/);
      if (match && match[1]) {
          const screenText = match[1].trim();
          syncBus.emit({
              type: 'PIN_CARD',
              payload: {
                  id: Math.random().toString(),
                  author: "Dream",
                  text: screenText
              }
          });
      }

      // 3. Play audio
      playCharacterSpeech(speaker, text);
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

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          // Stream processing: parse as it comes in to reduce latency
          // We look for 'Dream:' and 'Sidekick:' markers and queue them as soon as a newline hits.

          let currentSpeaker: 'dream' | 'sidekick' | null = null;
          let currentBuffer = '';

          while (true) {
              const { done, value } = await reader.read();
              if (done) {
                  // Flush remaining text that might not have a trailing newline
                  if (fullText.trim()) {
                       const trimmed = fullText.trim();
                       if (trimmed.startsWith('Dream:')) {
                            if (currentSpeaker && currentBuffer.trim()) processChunk(currentSpeaker, currentBuffer);
                            currentSpeaker = 'dream';
                            currentBuffer = trimmed.replace('Dream:', '').trim();
                       } else if (trimmed.startsWith('Sidekick:')) {
                            if (currentSpeaker && currentBuffer.trim()) processChunk(currentSpeaker, currentBuffer);
                            currentSpeaker = 'sidekick';
                            currentBuffer = trimmed.replace('Sidekick:', '').trim();
                       } else if (currentSpeaker) {
                           currentBuffer += ' ' + trimmed;
                       }
                  }

                  // Flush final buffer
                  if (currentSpeaker && currentBuffer.trim()) {
                      processChunk(currentSpeaker, currentBuffer);
                  }
                  break;
              }

              const chunk = decoder.decode(value, { stream: true });
              fullText += chunk;

              const lines = fullText.split('\n');
              // The last line might be incomplete, so we keep it in fullText and process the others
              fullText = lines.pop() || '';

              for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;

                  if (trimmed.startsWith('Dream:')) {
                      if (currentSpeaker && currentBuffer.trim()) {
                           processChunk(currentSpeaker, currentBuffer);
                      }
                      currentSpeaker = 'dream';
                      currentBuffer = trimmed.replace('Dream:', '').trim();
                  } else if (trimmed.startsWith('Sidekick:')) {
                      if (currentSpeaker && currentBuffer.trim()) {
                           processChunk(currentSpeaker, currentBuffer);
                      }
                      currentSpeaker = 'sidekick';
                      currentBuffer = trimmed.replace('Sidekick:', '').trim();
                  } else if (currentSpeaker) {
                      currentBuffer += ' ' + trimmed;
                  }
              }
          }

          setIsProcessing(false);

      } catch (error) {
          console.error("Failed to fetch chat response:", error);
          setIsProcessing(false);
      }
  }, [hideCharacters, processChunk]);

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
              // Show a loading state if we want, but for now just await
              console.log("ControlPage: Toggling camera ON");
              await gestureServiceRef.current.initialize(videoRef.current);
              gestureServiceRef.current.startTracking();
              setIsCameraActive(true);
          } catch (e) {
              console.error("Could not start camera:", e);
              alert("Failed to start camera. Please check permissions.");
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
