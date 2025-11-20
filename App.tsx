import React, { useState } from 'react';
import VideoCanvas from './components/VideoCanvas';
import Toolbar from './components/Toolbar';
import { COLORS } from './types';
import { Sparkles, X } from 'lucide-react';

const App: React.FC = () => {
  const [color, setColor] = useState<string>(COLORS[1].value); // Default Cyan
  const [brushSize, setBrushSize] = useState<number>(8);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  
  const [clearTrigger, setClearTrigger] = useState(0);

  const handleClear = () => {
    setClearTrigger(prev => prev + 1);
    setAiResult(null);
  };

  return (
    <div className="relative h-screen w-screen bg-black text-zinc-100 overflow-hidden font-sans">
      
      {/* Main Canvas Area - Full Screen */}
      <VideoCanvas 
        selectedColor={color}
        brushSize={brushSize}
        onColorSelect={setColor}
        onClear={() => setAiResult(null)} 
        isAnalysing={isAnalysing}
        setAnalysisResult={setAiResult}
        setIsAnalysing={setIsAnalysing}
      >
        {/* Toolbar Overlay - Passed as child to sit between video and cursor */}
        <Toolbar 
          selectedColor={color}
          brushSize={brushSize}
          onSelectColor={setColor}
          onSelectSize={setBrushSize}
          onClear={handleClear}
          onAnalyze={() => { 
            const event = new CustomEvent('triggerAnalyze');
            window.dispatchEvent(event);
           }}
           isAnalysing={isAnalysing}
        />
      </VideoCanvas>
        
      {/* Result Toast Overlay */}
      {aiResult && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-black/90 backdrop-blur-md border border-zinc-800 p-6 rounded-xl shadow-2xl relative flex flex-col gap-3">
              <button 
                onClick={() => setAiResult(null)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 text-white">
                <div className="p-1.5 bg-white/10 rounded-full">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-xs uppercase tracking-widest">AI Analysis</h3>
              </div>
              
              <p className="text-zinc-300 text-sm leading-relaxed font-light">
                {aiResult}
              </p>
          </div>
        </div>
      )}
      
      {/* Mobile Warning */}
      <div className="md:hidden absolute inset-0 z-[60] bg-black flex items-center justify-center p-8 text-center">
        <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 max-w-sm">
          <h2 className="text-lg font-semibold text-white mb-2">Desktop Required</h2>
          <p className="text-zinc-400 text-sm">Please use a desktop device for the best experience.</p>
        </div>
      </div>

      {/* Footer attribution */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
        <a
          href="https://bitcreate.studio"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors"
        >
          Bitcreate Studio
        </a>
      </div>

    </div>
  );
};

export default App;
