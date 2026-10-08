"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { SpeechService } from '@/lib/speech';
import { Mic, MicOff, UserX, MessageSquare, Play } from 'lucide-react';

export default function ControlPage() {
  const showCharacters = useCharacterStore((state) => state.showCharacters);
  const hideCharacters = useCharacterStore((state) => state.hideCharacters);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const [isListening, setIsListening] = useState(false);
  const speechServiceRef = useRef<SpeechService | null>(null);

  const simulateGreeting = useCallback(() => {
      updateCharacter('dream', { isSpeaking: true, text: 'Hello! I am Dream.' });
      setTimeout(() => {
          updateCharacter('dream', { isSpeaking: false, text: '' });
          updateCharacter('sidekick', { isSpeaking: true, text: 'And I am the sarcastic one.' });

          setTimeout(() => {
              updateCharacter('sidekick', { isSpeaking: false, text: '' });
          }, 3000);
      }, 3000);
  }, [updateCharacter]);

  useEffect(() => {
    speechServiceRef.current = new SpeechService(() => {
      showCharacters();
      // Simulate Phase 1 greeting immediately
      simulateGreeting();
    });

    return () => {
      if (speechServiceRef.current) {
        speechServiceRef.current.stopListening();
      }
    };
  }, [showCharacters, simulateGreeting]);

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
            <p className="text-neutral-400">Phase 1: Wake Word & Sync</p>
          </div>

          <div className="flex gap-4">
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
          {/* Manual Controls */}
          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="text-blue-400" />
              Manual Triggers
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  showCharacters();
                  simulateGreeting();
                }}
                className="w-full flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 px-4 py-3 rounded-lg transition-colors"
              >
                <Play size={18} />
                Trigger &quot;Hi Dream&quot; Sequence
              </button>

              <button
                onClick={hideCharacters}
                className="w-full flex items-center justify-center gap-2 bg-neutral-700 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-neutral-600 hover:border-red-500/50 px-4 py-3 rounded-lg transition-colors"
              >
                <UserX size={18} />
                Dismiss Characters
              </button>
            </div>
          </div>

          {/* Status Panel */}
          <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700">
            <h2 className="text-xl font-semibold mb-4">System Status</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2 rounded bg-neutral-900/50">
                <span className="text-neutral-400">Microphone</span>
                <span className={isListening ? 'text-green-400' : 'text-neutral-500'}>
                  {isListening ? 'Active (Listening for "Hi Dream")' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-neutral-900/50">
                <span className="text-neutral-400">Sync Bus</span>
                <span className="text-green-400">Connected (Broadcast & SSE)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-neutral-900/50">
                <span className="text-neutral-400">Stage Link</span>
                <a href="/stage" target="_blank" className="text-blue-400 hover:underline">
                  Open Stage in New Tab ↗
                </a>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg text-sm text-blue-200">
              <strong>Tip:</strong> Open the Stage link in a separate window. Click &quot;Start Mic&quot; and say &quot;Hi Dream&quot;, or use the manual trigger to see the characters appear.
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
