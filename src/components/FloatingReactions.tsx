import React from 'react';
import { RoomReaction } from '../types';

interface FloatingReactionsProps {
  reactions: RoomReaction[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r, idx) => {
        // pseudo-random horizontal spread based on timestamp
        const leftPercent = 20 + ((r.timestamp * 13 + idx * 29) % 60);

        return (
          <div
            key={r.id}
            className="absolute bottom-20 flex flex-col items-center animate-floatUp"
            style={{ left: `${leftPercent}%` }}
          >
            <span className="text-5xl filter drop-shadow-md select-none">{r.emoji}</span>
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold tracking-wide mt-1 select-none whitespace-nowrap shadow-sm">
              {r.senderName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
