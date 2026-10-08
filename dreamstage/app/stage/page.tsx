"use client";

import { useCharacterStore } from '@/store/useCharacterStore';
import { Character } from '@/components/stage/Character';
import { FloatingCard } from '@/components/stage/FloatingCard';
import { useEffect, useState } from 'react';
import { syncBus } from '@/lib/sync';
import { motion, AnimatePresence } from 'framer-motion';

interface PinnedCard {
    id: string;
    author: string;
    text: string;
    avatarUrl?: string;
}

export default function StagePage() {
  const { dream, sidekick } = useCharacterStore();
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5, isPinching: false, isVisible: false });
  const [pinnedCard, setPinnedCard] = useState<PinnedCard | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const unsubscribe = syncBus.subscribe((event) => {
        if (event.type === 'CURSOR_MOVE') {
            setCursor({
                x: event.payload.x,
                y: event.payload.y,
                isPinching: event.payload.isPinching,
                isVisible: true
            });

            // Auto-hide cursor if no updates for 2 seconds
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setCursor(prev => ({ ...prev, isVisible: false }));
            }, 2000);
        } else if (event.type === 'PIN_CARD') {
            setPinnedCard(event.payload);
        } else if (event.type === 'UNPIN_CARD') {
            setPinnedCard(null);
        }
    });

    return () => {
        unsubscribe();
        clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden pointer-events-none">
      {/* Ensure transparent background for OBS */}
      <style dangerouslySetInnerHTML={{__html: `
        body { background: transparent !important; }
      `}} />

      {/* Doctor Strange Magic Cursor */}
      {cursor.isVisible && (
          <motion.div
            className="absolute top-0 left-0 z-50 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.8)]"
            animate={{
                x: cursor.x * (typeof window !== 'undefined' ? window.innerWidth : 1920) - 25, // center the 50px div
                y: cursor.y * (typeof window !== 'undefined' ? window.innerHeight : 1080) - 25,
                scale: cursor.isPinching ? 0.7 : 1,
                borderColor: cursor.isPinching ? '#ef4444' : '#f97316', // red on pinch, orange normal
                boxShadow: cursor.isPinching ? '0 0 30px rgba(239,68,68,1)' : '0 0 20px rgba(249,115,22,0.8)'
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
            style={{ width: '50px', height: '50px' }}
          >
             <div className="w-2 h-2 bg-orange-200 rounded-full" />
             {/* Simple spinning magic ring effect */}
             <motion.div
                className="absolute w-[150%] h-[150%] border border-orange-400/50 rounded-full border-dashed"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             />
          </motion.div>
      )}

      <AnimatePresence>
          {pinnedCard && (
              <FloatingCard
                  id={pinnedCard.id}
                  author={pinnedCard.author}
                  text={pinnedCard.text}
                  avatarUrl={pinnedCard.avatarUrl}
                  onDismiss={() => setPinnedCard(null)}
              />
          )}
      </AnimatePresence>

      <Character
        name="dream"
        isVisible={dream.isVisible}
        isSpeaking={dream.isSpeaking}
        text={dream.text}
        color="#3b82f6" // blue-500
        side="left"
      />

      <Character
        name="sidekick"
        isVisible={sidekick.isVisible}
        isSpeaking={sidekick.isSpeaking}
        text={sidekick.text}
        color="#ef4444" // red-500
        side="right"
      />
    </main>
  );
}
