import React, { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS, BRUSH_SIZES } from '../types';
import { Trash2, BrainCircuit, Palette, Paintbrush } from 'lucide-react';
import { gsap } from 'gsap';

const ANALYZE_COOLDOWN_MS = 10000; // 10 seconds cooldown

interface ToolbarProps {
  selectedColor: string;
  brushSize: number;
  onSelectColor: (color: string) => void;
  onSelectSize: (size: number) => void;
  onClear: () => void;
  onAnalyze: () => void;
  isAnalysing: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedColor,
  brushSize,
  onSelectColor,
  onSelectSize,
  onClear,
  onAnalyze,
  isAnalysing
}) => {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const analyzeButtonRef = useRef<HTMLButtonElement>(null);
  const loaderRingRef = useRef<HTMLDivElement>(null);
  const loaderTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const isOnCooldown = cooldownRemaining > 0;
  const isButtonDisabled = isAnalysing || isOnCooldown;

  const handleAnalyzeClick = useCallback(() => {
    if (isButtonDisabled) return;
    onAnalyze();
    setCooldownRemaining(ANALYZE_COOLDOWN_MS);
  }, [isButtonDisabled, onAnalyze]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        const next = prev - 100;
        return next <= 0 ? 0 : next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  useEffect(() => {
    const ring = loaderRingRef.current;
    const timeline = loaderTimelineRef.current;

    if (!ring) return;

    if (timeline) {
      timeline.kill();
      loaderTimelineRef.current = null;
    }

    if (isAnalysing) {
      gsap.set(ring, { opacity: 1, scale: 1 });

      const tl = gsap.timeline({ repeat: -1 });
      tl.to(ring, { rotation: 360, duration: 1.6, ease: 'none', transformOrigin: '50% 50%' });
      tl.to(ring, { boxShadow: '0 0 18px rgba(168,85,247,0.45)', duration: 0.6, ease: 'sine.inOut' }, 0);
      tl.to(ring, { boxShadow: '0 0 18px rgba(34,211,238,0.55)', duration: 0.6, ease: 'sine.inOut', delay: 0.4 }, 0);
      loaderTimelineRef.current = tl;
    } else {
      gsap.to(ring, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    }

    return () => {
      loaderTimelineRef.current?.kill();
      loaderTimelineRef.current = null;
    };
  }, [isAnalysing]);

  return (
    <div className="absolute right-0 top-0 h-full w-72 bg-black/90 backdrop-blur-sm border-l border-zinc-800 p-6 flex flex-col gap-8 z-20">
      
      <div className="space-y-1 pt-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          AIRDRAW
        </h1>
        <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">
          Gesture Canvas
        </p>
      </div>

      <div className="h-px bg-zinc-800 w-full" />

      {/* Colors */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Palette className="w-3 h-3" />
          <h3 className="text-[10px] font-semibold uppercase tracking-widest">Palette</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {COLORS.map((c) => (
            <button
              key={c.value}
              data-color={c.value}
              onClick={() => onSelectColor(c.value)}
              className={`w-10 h-10 rounded-md transition-all duration-200 focus:outline-none ${
                selectedColor === c.value 
                  ? 'ring-2 ring-white scale-110 z-10' 
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              style={{ 
                backgroundColor: c.value, 
                border: '1px solid rgba(255,255,255,0.1)' 
              }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Brush Size */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Paintbrush className="w-3 h-3" />
          <h3 className="text-[10px] font-semibold uppercase tracking-widest">Stroke Weight</h3>
        </div>
        <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              data-size={size}
              onClick={() => onSelectSize(size)}
              className={`flex items-center justify-center w-10 h-10 rounded-md transition-all ${
                brushSize === size 
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm' 
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <div 
                className="rounded-full bg-current"
                style={{ width: Math.max(3, size / 2.5), height: Math.max(3, size / 2.5) }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="space-y-3 pb-4">
        <button
          data-action="analyze"
          onClick={handleAnalyzeClick}
          disabled={isButtonDisabled}
          ref={analyzeButtonRef}
          className={`group relative w-full h-11 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-all
            ${isButtonDisabled
              ? 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800'
              : 'bg-white text-black hover:bg-zinc-200 border border-white'
            }`}
        >
          <div
            ref={loaderRingRef}
            className="pointer-events-none absolute inset-[-4px] rounded-lg bg-[conic-gradient(at_50%_50%,#22d3ee,#a855f7,#f59e0b,#22d3ee)] opacity-0"
            style={{ WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 65%)', maskImage: 'radial-gradient(circle, transparent 62%, black 65%)' }}
            aria-hidden
          />
          {isAnalysing ? (
            <BrainCircuit className="w-4 h-4 animate-pulse" />
          ) : (
            <BrainCircuit className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
          <span className="tracking-wide font-semibold">
            {isAnalysing ? 'ENHANCING...' : isOnCooldown ? `WAIT ${cooldownSeconds}s` : 'ENHANCE DRAWING'}
          </span>
        </button>

        <button
          data-action="clear"
          onClick={onClear}
          className="group w-full h-11 rounded-md bg-transparent border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 flex items-center justify-center gap-2 text-sm font-medium transition-all"
        >
          <Trash2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
          <span className="tracking-wide">CLEAR CANVAS</span>
        </button>
      </div>

    </div>
  );
};

export default Toolbar;