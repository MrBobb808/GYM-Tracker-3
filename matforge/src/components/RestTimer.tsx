import React, { useState, useEffect, useRef } from 'react';
import { Timer, X, Play, Square } from 'lucide-react';
import { cn } from '../lib/utils';

interface RestTimerProps {
  variant?: 'floating' | 'nav';
}

export default function RestTimer({ variant = 'floating' }: RestTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

  const startTimer = (seconds: number) => { setTimeLeft(seconds); setIsActive(true); setIsOpen(true); };
  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  if (!isOpen && timeLeft === 0) {
    return (
      <button 
        onClick={() => setIsOpen(true)} 
        className={cn(
          "bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl text-white hover:bg-white/20 hover:scale-105 transition-all z-50 group",
          variant === 'floating' ? "fixed bottom-8 right-8 p-4" : "p-2"
        )}
      >
        <Timer size={variant === 'floating' ? 24 : 18} className="group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className={cn(
      "bg-[#0A0A0A]/90 backdrop-blur-2xl border p-5 rounded-2xl z-50 transition-all duration-500 w-72 shadow-2xl",
      variant === 'floating' ? "fixed bottom-8 right-8" : "absolute top-16 right-0",
      timeLeft === 0 && isOpen && !isActive ? 'border-white/10' : 'border-emerald-500/50 shadow-emerald-900/20'
    )}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-zinc-300"><Timer size={16} className="text-emerald-400" /> Recovery Timer</h4>
        <button onClick={() => { setIsOpen(false); setIsActive(false); setTimeLeft(0); }} className="text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {timeLeft > 0 ? (
        <div className="text-center">
          <div className="text-5xl font-mono font-light text-white mb-6 tracking-tight">{formatTime(timeLeft)}</div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setIsActive(!isActive)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-white transition-colors">
              {isActive ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button onClick={() => setTimeLeft(0)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-semibold tracking-wider text-zinc-400 hover:text-white transition-colors">RESET</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => startTimer(60)} className="py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm font-medium text-zinc-300 transition-colors">1m</button>
          <button onClick={() => startTimer(120)} className="py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm font-medium text-zinc-300 transition-colors">2m</button>
          <button onClick={() => startTimer(180)} className="py-3 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-colors">3m</button>
        </div>
      )}
    </div>
  );
}
