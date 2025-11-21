import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Point } from '../types';
import { Loader2, Camera, Hand, MousePointer2 } from 'lucide-react';
import { analyzeDrawing } from '../services/geminiService';

// --- Constants ---
const PINCH_THRESHOLD = 0.12; // Increased from 0.08 for more reliable pinch detection
const SMOOTHING_FACTOR = 0.2;
const CURSOR_RADIUS = 6;

interface VideoCanvasProps {
  selectedColor: string;
  brushSize: number;
  onColorSelect: (color: string) => void;
  onClear: () => void;
  isAnalysing: boolean;
  setAnalysisResult: (text: string) => void;
  setIsAnalysing: (val: boolean) => void;
  children?: React.ReactNode;
}

const VideoCanvas: React.FC<VideoCanvasProps> = ({
  selectedColor,
  brushSize,
  onColorSelect,
  onClear,
  isAnalysing,
  setAnalysisResult,
  setIsAnalysing,
  children
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  
  const lastPoint = useRef<Point | null>(null);
  const currentCursor = useRef<Point>({ x: 0, y: 0 });
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // --- Setup MediaPipe ---
  useEffect(() => {
    const setupHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        setIsLoading(false);

        // Await camera startup to ensure proper initialization order
        await startCamera();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setIsLoading(false);
      }
    };
    setupHandLandmarker();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user",
        },
      });
      videoRef.current.srcObject = stream;

      // Wait for video to be ready with frame data before starting detection
      await new Promise<void>((resolve) => {
        const video = videoRef.current!;
        const checkReady = () => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
            video.removeEventListener('loadedmetadata', checkReady);
            video.removeEventListener('loadeddata', checkReady);
            resolve();
          }
        };

        video.addEventListener('loadedmetadata', checkReady);
        video.addEventListener('loadeddata', checkReady);

        // Check immediately in case already ready
        if (video.readyState >= 2) {
          video.removeEventListener('loadedmetadata', checkReady);
          video.removeEventListener('loadeddata', checkReady);
          resolve();
        }
      });

      setHasCameraPermission(true);
      console.log("Camera ready, starting hand detection loop");

      // NOW start the animation loop after video is confirmed ready
      predictWebcam();
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setHasCameraPermission(false);
    }
  };

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const lerp = (start: number, end: number, amt: number) => {
    return (1 - amt) * start + amt * end;
  };

  const checkUiCollisions = (x: number, y: number) => {
    // Using document.elementFromPoint to find UI elements under the cursor
    // even if the cursor canvas is on top (because cursor canvas has pointer-events-none)
    const element = document.elementFromPoint(x, y);
    
    if (element && isDrawingRef.current) {
      const colorAttr = element.getAttribute('data-color');
      if (colorAttr) {
        onColorSelect(colorAttr);
        if (navigator.vibrate) navigator.vibrate(20);
      }
      
      const actionAttr = element.getAttribute('data-action');
      if (actionAttr === 'clear') {
         clearCanvas();
      }
      
      if (actionAttr === 'analyze' && !isAnalysing) {
        handleAnalyze();
      }
    }
  };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onClear();
    }
  }, [onClear]);

  const handleAnalyze = async () => {
      if (canvasRef.current) {
        setIsAnalysing(true);
        const dataUrl = canvasRef.current.toDataURL("image/png");
        const result = await analyzeDrawing(dataUrl);
        setAnalysisResult(result);
        setIsAnalysing(false);
      }
  };


  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current || !cursorCanvasRef.current || !handLandmarkerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const cursorCtx = cursorCanvasRef.current.getContext('2d');
    const ctx = canvas.getContext('2d');

    if (!cursorCtx || !ctx) return;

    // Check if video has frame data available
    if (video.readyState < 2) { // HAVE_CURRENT_DATA
      console.warn("Video not ready, readyState:", video.readyState);
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }

    // Check if video dimensions are available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video dimensions not ready");
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }

    // Resize handling
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
       // Set canvas resolution to match window
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
       cursorCanvasRef.current.width = window.innerWidth;
       cursorCanvasRef.current.height = window.innerHeight;
       
       ctx.lineCap = 'round';
       ctx.lineJoin = 'round';
    }
    
    const startTimeMs = performance.now();
    const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

    cursorCtx.clearRect(0, 0, cursorCanvasRef.current.width, cursorCanvasRef.current.height);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      const indexTip = landmarks[8]; 
      const thumbTip = landmarks[4]; 

      const pinchDistance = getDistance(
        { x: indexTip.x, y: indexTip.y },
        { x: thumbTip.x, y: thumbTip.y }
      );

      const isPinchingNow = pinchDistance < PINCH_THRESHOLD;
      setIsPinching(isPinchingNow);

      // Map normalized coordinates to screen size
      // Note: We assume video covers screen logic or we map strictly to canvas size
      const targetX = (1 - indexTip.x) * canvas.width; 
      const targetY = indexTip.y * canvas.height;

      const x = lerp(currentCursor.current.x, targetX, SMOOTHING_FACTOR);
      const y = lerp(currentCursor.current.y, targetY, SMOOTHING_FACTOR);
      currentCursor.current = { x, y };

      // UI Interaction Check
      if (isPinchingNow) {
         checkUiCollisions(x, y);
      }

      if (isPinchingNow) {
        // Active Drawing Cursor
        cursorCtx.beginPath();
        cursorCtx.arc(x, y, CURSOR_RADIUS * 1.5, 0, 2 * Math.PI);
        cursorCtx.fillStyle = selectedColor;
        cursorCtx.fill();
        cursorCtx.strokeStyle = 'white';
        cursorCtx.lineWidth = 2;
        cursorCtx.stroke();

        if (lastPoint.current) {
          ctx.beginPath();
          ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
          ctx.lineTo(x, y);
          ctx.strokeStyle = selectedColor;
          ctx.lineWidth = brushSize;
          ctx.stroke();
        }
        
        lastPoint.current = { x, y };
        isDrawingRef.current = true;

      } else {
        // Hover Cursor
        cursorCtx.beginPath();
        cursorCtx.arc(x, y, CURSOR_RADIUS, 0, 2 * Math.PI);
        cursorCtx.strokeStyle = 'white'; // White cursor outline for better visibility on black/video
        cursorCtx.lineWidth = 2;
        cursorCtx.stroke();
        
        // Inner Color Dot
        cursorCtx.beginPath();
        cursorCtx.arc(x, y, 3, 0, 2 * Math.PI);
        cursorCtx.fillStyle = selectedColor;
        cursorCtx.fill();

        lastPoint.current = null; 
        isDrawingRef.current = false;
      }
    } else {
      lastPoint.current = null;
      isDrawingRef.current = false;
      setIsPinching(false);
    }

    animationFrameId.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-zinc-500" />
          <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Initializing Vision Models...</p>
        </div>
      )}

      {/* Permission Error */}
      {!isLoading && !hasCameraPermission && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-red-500">
          <Camera className="w-10 h-10 mb-4" />
          <p className="text-base font-medium">Camera Access Denied</p>
        </div>
      )}

      {/* Video Feed - Base Layer */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-40 grayscale-[20%]"
        autoPlay
        playsInline
        muted
      />

      {/* Drawing Canvas - Layer 1 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-10"
      />
      
      {/* UI Children (Toolbar) - Layer 2 */}
      {children && (
         <div className="absolute inset-0 z-20 pointer-events-none">
             <div className="w-full h-full pointer-events-auto">
                 {children}
             </div>
         </div>
      )}

      {/* Cursor Canvas - Layer 3 (Top) */}
      {/* pointer-events-none ensures clicks pass through to Toolbar */}
      <canvas
         ref={cursorCanvasRef}
         className="absolute inset-0 w-full h-full object-cover pointer-events-none z-30"
      />

      {/* Status Badge - Layer 4 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-40">
        <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all duration-500 ${
          isPinching 
            ? 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.25)]' 
            : 'bg-zinc-950/90 border-zinc-800 backdrop-blur-md'
        }`}>
          {isPinching ? (
             <MousePointer2 className="w-4 h-4 text-black fill-black" />
          ) : (
             <Hand className="w-4 h-4 text-zinc-500" />
          )}
          <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase ${
             isPinching ? 'text-black' : 'text-zinc-500'
          }`}>
            {isPinching ? 'Active' : 'Pinch to Draw'}
          </span>
        </div>
      </div>

    </div>
  );
};

export default VideoCanvas;