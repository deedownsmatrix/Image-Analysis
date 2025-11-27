import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner, ProgressBar } from './UI';
import { GeminiService } from '../services/geminiService';
import { VideoAnalysisResult, ProcessingStatus, VideoFrameAnalysis } from '../types';
import { extractFramesFromVideo } from '../utils/mediaUtils';

export const VideoAnalyzer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [currentFrameAnalysis, setCurrentFrameAnalysis] = useState<VideoFrameAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to scroll to bottom of logs
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result?.frames, currentFrameAnalysis]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('video/')) {
        setError("Please upload a valid video file (MP4/WebM).");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setCurrentFrameAnalysis(null);
      setStatus(ProcessingStatus.IDLE);
      setProgress(0);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setError(null);
      setResult({ frames: [], finalReport: '' });
      
      // Step 1: Extract Frames
      setStatus(ProcessingStatus.EXTRACTING);
      setProgress(0);
      const frames = await extractFramesFromVideo(file, (pct) => setProgress(pct));
      
      if (frames.length === 0) {
        throw new Error("Could not extract any frames from the video.");
      }

      // Step 2: Analyze Frames Sequentially
      setStatus(ProcessingStatus.ANALYZING);
      setProgress(0);
      
      const analysisResult = await GeminiService.analyzeVideoFrames(frames, (frameResult) => {
        setCurrentFrameAnalysis(frameResult);
        setResult(prev => {
            const currentFrames = prev?.frames || [];
            return { ...prev, frames: [...currentFrames, frameResult], finalReport: '' };
        });
      });

      setResult(analysisResult);
      setStatus(ProcessingStatus.COMPLETE);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze video.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Video Contextual Analysis</h2>
      </div>

      <Card>
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            accept="video/mp4, video/webm"
            onChange={handleFileChange}
            className="hidden"
            id="video-upload"
          />
          <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
            <div className="text-gray-400 mb-4">
               <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
            <span className="text-indigo-600 font-medium text-lg">
              {file ? `Selected: ${file.name}` : "Upload Video to Analyze"}
            </span>
            <span className="text-gray-400 text-sm mt-1">MP4 or WebM supported (Max 10 keyframes analyzed)</span>
          </label>
        </div>

        {/* Action Button */}
        {file && status === ProcessingStatus.IDLE && (
          <div className="mt-6 flex justify-center">
            <Button onClick={handleAnalyze} className="w-full md:w-auto min-w-[200px]">
              Start Video Analysis
            </Button>
          </div>
        )}

        {/* Progress Display */}
        {status === ProcessingStatus.EXTRACTING && (
          <div className="mt-8">
             <ProgressBar progress={progress} label="Extracting Keyframes (Client-side simulation)..." />
          </div>
        )}

        {status === ProcessingStatus.ANALYZING && (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center gap-3">
                <Spinner size="md" />
                <span className="font-semibold text-gray-700">Analyzing frame sequence with Gemini...</span>
            </div>
            {currentFrameAnalysis && (
                <div className="bg-indigo-50 text-indigo-800 px-4 py-2 rounded-full text-sm font-medium animate-pulse">
                    Processing Frame: {currentFrameAnalysis.timestamp}
                </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3">
             <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
             <span>{error}</span>
          </div>
        )}
      </Card>

      {/* Real-time Logs / Results */}
      {(result?.frames.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
            
            {/* Left Col: Sequential Logs */}
            <div className="lg:col-span-1 space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Frame Analysis Log</h3>
                <div className="bg-gray-900 rounded-xl p-4 h-[500px] overflow-y-auto space-y-3 shadow-inner custom-scrollbar">
                    {result?.frames.map((frame, idx) => (
                        <div key={idx} className="border-l-2 border-indigo-500 pl-3 py-1">
                            <div className="text-xs font-mono text-indigo-400 mb-1">[{frame.timestamp}]</div>
                            <p className="text-sm text-gray-300 leading-relaxed">{frame.analysis}</p>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* Right Col: Final Report */}
            <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Final Video Analysis Report</h3>
                <Card className="h-[500px] overflow-y-auto flex flex-col justify-center">
                    {status === ProcessingStatus.COMPLETE ? (
                        <div className="prose prose-indigo max-w-none">
                            <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                                <h4 className="text-green-800 font-bold text-xl mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Analysis Complete
                                </h4>
                                <p className="text-gray-800 whitespace-pre-wrap leading-7">
                                    {result?.finalReport}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 flex flex-col items-center">
                            <Spinner size="lg" color="text-gray-300" />
                            <p className="mt-4">Aggregating insights for final report...</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
      )}
    </div>
  );
};