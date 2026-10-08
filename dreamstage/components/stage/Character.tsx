"use client";

import { motion, AnimatePresence } from 'framer-motion';

interface CharacterProps {
  name: 'dream' | 'sidekick';
  isVisible: boolean;
  isSpeaking: boolean;
  text: string;
  color: string;
  side: 'left' | 'right';
}

export function Character({ name, isVisible, isSpeaking, text, color, side }: CharacterProps) {
  // Simple floating animation for idle state
  const floatAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  };

  // Quick bounce when speaking
  const speakAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.2,
      repeat: Infinity,
      repeatType: "reverse" as const
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.5, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`absolute bottom-10 ${side === 'left' ? 'left-10' : 'right-10'} flex flex-col ${side === 'left' ? 'items-start' : 'items-end'}`}
        >
          {/* Speech Bubble */}
          <AnimatePresence>
            {text && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className={`mb-4 max-w-xs p-4 rounded-2xl shadow-xl text-white font-medium ${
                  side === 'left' ? 'rounded-bl-none' : 'rounded-br-none'
                }`}
                style={{ backgroundColor: color }}
              >
                {text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar Base */}
          <motion.div
            animate={isSpeaking ? speakAnimation : floatAnimation}
            className={`w-32 h-32 rounded-full border-4 shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center justify-center overflow-hidden`}
            style={{
              borderColor: color,
              backgroundColor: '#1e1e2e',
              boxShadow: `0 0 20px ${color}80`
            }}
          >
            {/* Simple SVG face placeholder */}
            <svg viewBox="0 0 100 100" className="w-24 h-24">
              {/* Eyes */}
              <circle cx="35" cy="40" r="5" fill={color} />
              <circle cx="65" cy="40" r="5" fill={color} />
              {/* Mouth */}
              {isSpeaking ? (
                <ellipse cx="50" cy="65" rx="15" ry="10" fill={color} />
              ) : (
                <path d="M 35 65 Q 50 75 65 65" stroke={color} strokeWidth="4" fill="transparent" strokeLinecap="round" />
              )}
            </svg>
          </motion.div>

          {/* Name tag */}
          <div
            className="mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: color }}
          >
            {name === 'dream' ? 'Dream' : 'Sidekick'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
