import React, { useRef, useState, useEffect } from 'react';
import { Button, Card, Spinner } from './UI';
import { GeminiService } from '../services/geminiService';
import { ImageAnalysisResult } from '../types';

// Distinct colors for bounding boxes (matching ImageAnalyzer)
const BOX_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export const WebcamAnalyzer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Mode State
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // Base64
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Data State
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Attempt to start camera immediately on mount
    startCamera();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn("Error stopping track:", e);
          }
      });
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const startCamera = async () => {
    // Ensure we clean up any existing stream before starting a new one
    stopCamera();

    try {
      setError(null);
      setPermissionDenied(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser or context.");
      }

      let stream: MediaStream | null = null;

      // Retry Logic: Try HD first, then fall back to any available video
      try {
        // Attempt 1: HD Resolution
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 } 
          }, 
          audio: false 
        });
      } catch (hdError) {
        console.warn("Failed to get HD camera stream, trying basic constraints...", hdError);
        try {
          // Attempt 2: Basic Video (Any resolution/device)
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
        } catch (basicError) {
          // If both fail, throw the error from the basic attempt (or handle specifically)
          throw basicError;
        }
      }
      
      if (!stream) {
          throw new Error("Could not initialize video stream.");
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Explicitly play to ensure it starts (sometimes autoPlay is blocked)
        try {
            await videoRef.current.play();
        } catch (playErr) {
            console.error("Error playing video:", playErr);
        }
      }
      setIsStreaming(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setIsStreaming(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError("Camera access was denied. Please allow camera access in your browser settings to continue.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No camera found. Please ensure a camera is connected and recognized by your device.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError("Camera is currently in use by another application or OS permission is blocked. Please close other apps using the camera.");
      } else {
        setError(err.message || "Could not access camera.");
      }
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;

    try {
      // 1. Capture Frame to Canvas
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas context");
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 2. Convert to Base64 (remove prefix for API)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];
      
      setCapturedImage(dataUrl); // Keep full URL for display
      stopCamera(); // Pause stream for "Snapshot" feel

      // 3. Analyze
      setIsAnalyzing(true);
      setError(null);
      
      const analysisData = await GeminiService.analyzeImage(base64);
      setResult(analysisData);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze snapshot.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
    startCamera();
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Webcam Snapshot Analysis</h2>
      </div>

      <Card className="p-0 overflow-hidden bg-black relative min-h-[400px] flex flex-col">
        
        {/* Main Visual Area */}
        <div className="relative flex-grow bg-gray-900 flex items-center justify-center overflow-hidden">
          
          {/* State 1: Live Camera Feed */}
          {!capturedImage && (
            <>
              {!isStreaming && !error && (
                <div className="text-white flex flex-col items-center z-10">
                   <Spinner size="lg" color="text-white" />
                   <p className="mt-4 text-gray-300">Requesting Camera Access...</p>
                </div>
              )}
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className={`w-full h-full object-contain ${isStreaming ? 'opacity-100' : 'opacity-0'}`} 
              />
            </>
          )}

          {/* State 2: Captured Snapshot Display */}
          {capturedImage && (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Snapshot" className="w-full h-full object-contain" />
              
              {/* Bounding Boxes Overlay */}
              {result && result.objects.map((obj, i) => {
                 // Gemini returns [ymin, xmin, ymax, xmax] 0-1000
                 const [ymin, xmin, ymax, xmax] = obj.box_2d;
                 const color = BOX_COLORS[i % BOX_COLORS.length];
                 
                 // Smart Label Positioning
                 const isTopEdge = ymin < 50; 

                 return (
                   <div
                     key={i}
                     className="absolute border-2 transition-all duration-500 ease-out z-10 animate-fade-in"
                     style={{
                       top: `${ymin / 10}%`,
                       left: `${xmin / 10}%`,
                       height: `${(ymax - ymin) / 10}%`,
                       width: `${(xmax - xmin) / 10}%`,
                       borderColor: color,
                       boxShadow: '0 0 0 1px rgba(255,255,255,0.2)'
                     }}
                   >
                     <span 
                       className={`absolute left-[-2px] text-xs md:text-sm font-bold text-white px-2 py-1 rounded shadow-sm whitespace-nowrap 
                       ${isTopEdge ? 'top-0' : '-top-7'}`}
                       style={{ backgroundColor: color }}
                     >
                        {obj.name}
                     </span>
                   </div>
                 );
               })}
            </div>
          )}

          {/* Error / Permission Overlay */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8 z-30">
              <div className="bg-white p-6 rounded-lg text-center max-w-md shadow-xl">
                <div className="text-red-600 font-bold text-xl mb-2 flex justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div className="text-gray-800 font-semibold text-lg mb-2">Camera Issue</div>
                <p className="text-gray-600 mb-6">{error}</p>
                <Button onClick={startCamera}>
                  {permissionDenied ? "Retry Permission" : "Retry Camera"}
                </Button>
              </div>
            </div>
          )}

          {/* Analysis Loading Overlay */}
          {isAnalyzing && (
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-white">
                <Spinner size="lg" color="text-indigo-400" />
                <p className="mt-4 text-lg font-medium animate-pulse">Analyzing Snapshot...</p>
             </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="bg-white p-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Left: Status Text */}
            <div className="text-sm text-gray-500 order-2 md:order-1">
                {!capturedImage ? "Align objects in frame" : isAnalyzing ? "Processing..." : "Analysis Complete"}
            </div>

            {/* Center/Right: Action Buttons */}
            <div className="flex gap-4 order-1 md:order-2 w-full md:w-auto">
                {!capturedImage ? (
                    <button 
                        onClick={handleCapture}
                        disabled={!isStreaming}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 py-3 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        Take Snapshot
                    </button>
                ) : (
                    <Button 
                        onClick={handleRetake} 
                        variant="secondary"
                        disabled={isAnalyzing}
                        className="flex-1 md:flex-none min-w-[150px]"
                    >
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        Retake
                    </Button>
                )}
            </div>
        </div>
      </Card>

      {/* Results Section (Text) */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">
           <Card className="border-l-4 border-l-primary">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Snapshot Analysis
            </h3>
            <p className="text-gray-700 leading-relaxed text-lg">
              {result.narrative}
            </p>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Detected Objects</h3>
            <div className="flex flex-wrap gap-2">
                {result.objects.map((obj, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: BOX_COLORS[i % BOX_COLORS.length] }}></span>
                        {obj.name}
                        <span className="ml-2 text-xs text-gray-500">({obj.confidence})</span>
                    </span>
                ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};