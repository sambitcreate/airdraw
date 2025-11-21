import React, { useState } from 'react';
import VideoCanvas from './components/VideoCanvas';
import Toolbar from './components/Toolbar';
import { COLORS } from './types';
import { Sparkles, X, Download } from 'lucide-react';

const App: React.FC = () => {
  const [color, setColor] = useState<string>(COLORS[1].value); // Default Cyan
  const [brushSize, setBrushSize] = useState<number>(8);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');

  const handleClear = () => {
    setEnhancedImage(null);
    // Dispatch a custom event to trigger canvas clearing in VideoCanvas
    const event = new CustomEvent('triggerClear');
    window.dispatchEvent(event);
  };

  return (
    <div className="relative h-screen w-screen bg-black text-zinc-100 overflow-hidden font-sans">
      
      {/* Main Canvas Area - Full Screen */}
      <VideoCanvas
        selectedColor={color}
        brushSize={brushSize}
        tool={tool}
        onColorSelect={setColor}
        onSizeSelect={setBrushSize}
        onToolSelect={setTool}
        onClear={handleClear}
        isAnalysing={isAnalysing}
        setEnhancedImage={setEnhancedImage}
        setIsAnalysing={setIsAnalysing}
      >
        {/* Toolbar Overlay - Passed as child to sit between video and cursor */}
        <Toolbar 
          selectedColor={color}
          brushSize={brushSize}
          tool={tool}
          onSelectColor={setColor}
          onSelectSize={setBrushSize}
          onSelectTool={setTool}
          onClear={handleClear}
          onAnalyze={() => { 
            const event = new CustomEvent('triggerAnalyze');
            window.dispatchEvent(event);
           }}
           isAnalysing={isAnalysing}
        />
      </VideoCanvas>
        
      {/* Result Display */}
      {enhancedImage && (
        <>
          {/* Blurred background overlay */}
          <div
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setEnhancedImage(null)}
          />
          
          {/* Image container */}
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 animate-in zoom-in-95 duration-300">
            <div className="relative flex flex-col items-center gap-4 w-[70vw] h-[70vh]">
              {/* Close button */}
              <button
                onClick={() => setEnhancedImage(null)}
                className="absolute -top-12 right-0 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* Image */}
              <img
                src={enhancedImage}
                alt="Enhanced drawing"
                className="w-full h-full object-contain rounded-lg shadow-2xl"
              />
              
              {/* Save button */}
              <a
                href={enhancedImage}
                download="airdraw-enhanced.png"
                className="inline-flex items-center gap-2 text-sm font-semibold text-black bg-white rounded-md px-4 py-2 hover:bg-zinc-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
                Save Image
              </a>
            </div>
          </div>
        </>
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
