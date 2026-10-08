"use client";

import { motion, AnimatePresence } from 'framer-motion';

interface FloatingCardProps {
  id: string;
  author: string;
  text: string;
  avatarUrl?: string;
  onDismiss: (id: string) => void;
}

export function FloatingCard({ id, author, text, avatarUrl, onDismiss }: FloatingCardProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0, opacity: 0, rotate: 10 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
      >
        <div className="relative bg-neutral-900/90 backdrop-blur-md border-2 border-orange-500/50 p-6 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.3)] max-w-2xl w-full">

            {/* Magic Portal Sparkle Ring behind the card */}
            <motion.div
                className="absolute -inset-4 border-[3px] border-orange-400/30 rounded-3xl border-dashed pointer-events-none -z-10"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />

            <div className="flex items-start gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt={author} className="w-16 h-16 rounded-full border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center text-2xl font-bold text-blue-400">
                  {author.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-400 mb-2">{author}</h3>
                <p className="text-2xl text-white font-medium leading-relaxed">{text}</p>
              </div>
            </div>

            {/* Quick debug dismiss button, normally would pinch it away */}
            <button
                onClick={() => onDismiss(id)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg hover:bg-red-600 pointer-events-auto"
            >
                ✕
            </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
