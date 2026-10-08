"use client";

import { useCharacterStore } from '@/store/useCharacterStore';
import { Character } from '@/components/stage/Character';

export default function StagePage() {
  const { dream, sidekick } = useCharacterStore();

  return (
    <main className="relative w-screen h-screen overflow-hidden pointer-events-none">
      {/*
        This div exists to make sure the background is completely transparent
        for OBS Studio. The global styles might set a background color, so we
        override it here or in layout.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        body { background: transparent !important; }
      `}} />

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
