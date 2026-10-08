"use client";

import { useState } from 'react';
import { syncBus } from '@/lib/sync';
import { Pin } from 'lucide-react';

interface ChatMessage {
    id: string;
    author: string;
    text: string;
}

export function YouTubeChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [apiKey, setApiKey] = useState('');
    const [videoId, setVideoId] = useState('');
    const [isPolling, setIsPolling] = useState(false);

    // In a real app we'd use setInterval to hit the YT API.
    // For this demo, we'll mock it since actual YT Data API requires OAuth/proper setup.
    const startMockPolling = () => {
        setIsPolling(true);
        let count = 0;

        const mockAuthors = ["Fan123", "CoolGamer", "TechPro", "DreamLover", "ReactNinja"];
        const mockTexts = ["This overlay is insane!", "Wait, how does that hand tracking work?!", "Hello Dream!", "What game are we playing?", "LMAO Sidekick is so rude"];

        const interval = setInterval(() => {
            if (count > 10) {
                clearInterval(interval);
                setIsPolling(false);
                return;
            }

            const newMsg = {
                id: Math.random().toString(),
                author: mockAuthors[Math.floor(Math.random() * mockAuthors.length)],
                text: mockTexts[Math.floor(Math.random() * mockTexts.length)],
            };

            setMessages(prev => [newMsg, ...prev].slice(0, 50));
            count++;
        }, 3000);
    };

    const pinMessage = (msg: ChatMessage) => {
        syncBus.emit({
            type: 'PIN_CARD',
            payload: {
                id: msg.id,
                author: msg.author,
                text: msg.text,
            }
        });
    };

    const unpinMessage = () => {
        syncBus.emit({ type: 'UNPIN_CARD' });
    };

    return (
        <div className="bg-neutral-800 p-6 rounded-xl border border-neutral-700 h-96 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <span className="text-red-500">▶</span> YouTube Live Chat (Mock)
                </h2>
                <button
                    onClick={unpinMessage}
                    className="text-xs bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                >
                    Clear Pinned
                </button>
            </div>

            {!isPolling && messages.length === 0 ? (
                <div className="flex flex-col gap-3 justify-center items-center h-full text-neutral-400">
                    <p className="text-sm text-center">Connect to a stream to see chat</p>
                    <button
                        onClick={startMockPolling}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Start Mock Stream
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {messages.map((msg) => (
                        <div key={msg.id} className="bg-neutral-900/50 p-3 rounded group relative hover:bg-neutral-900 transition-colors">
                            <span className="font-bold text-blue-400 mr-2">{msg.author}:</span>
                            <span className="text-neutral-200">{msg.text}</span>

                            <button
                                onClick={() => pinMessage(msg)}
                                className="absolute top-2 right-2 p-1.5 bg-neutral-700 hover:bg-orange-500 hover:text-white rounded text-neutral-400 opacity-0 group-hover:opacity-100 transition-all"
                                title="Pin to Stage"
                            >
                                <Pin size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
