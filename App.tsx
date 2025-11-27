import React, { useState } from 'react';
import { AnalysisMode } from './types';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import { VideoAnalyzer } from './components/VideoAnalyzer';
import { WebcamAnalyzer } from './components/WebcamAnalyzer';
import { Card } from './components/UI';

const App: React.FC = () => {
  const [mode, setMode] = useState<AnalysisMode>(AnalysisMode.NONE);

  const renderWelcome = () => (
    <div className="max-w-6xl mx-auto w-full px-4 pt-10 pb-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-6">
          Visionary Analyst
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Leverage the power of <span className="font-semibold text-gray-800">Gemini 2.5 Flash</span> to inspect, count, and contextualize objects in images and videos with unprecedented speed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Static Image Card */}
        <Card 
          hoverable 
          onClick={() => setMode(AnalysisMode.IMAGE)}
          className="group text-center py-12 border-t-4 border-t-primary"
        >
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 transition-colors">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Static Image Analysis</h2>
          <p className="text-gray-500 leading-relaxed text-sm">
            Upload a JPEG or PNG. Get a structured list of objects with confidence scores and a scene narrative.
          </p>
          <div className="mt-8 text-primary font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center">
            Select Mode <span className="ml-2">→</span>
          </div>
        </Card>

        {/* Video File Card */}
        <Card 
          hoverable 
          onClick={() => setMode(AnalysisMode.VIDEO)}
          className="group text-center py-12 border-t-4 border-t-secondary"
        >
          <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-100 transition-colors">
            <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Video File Analysis</h2>
          <p className="text-gray-500 leading-relaxed text-sm">
            Upload MP4/WebM. Track object movement and context changes over time via keyframes.
          </p>
          <div className="mt-8 text-secondary font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center">
            Select Mode <span className="ml-2">→</span>
          </div>
        </Card>

        {/* Webcam Live Card */}
        <Card 
          hoverable 
          onClick={() => setMode(AnalysisMode.WEBCAM)}
          className="group text-center py-12 border-t-4 border-t-red-500"
        >
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-red-100 transition-colors">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Real-Time Live</h2>
          <p className="text-gray-500 leading-relaxed text-sm">
            Connect your webcam for a live, conversational video analysis session with Gemini 2.5 Flash.
          </p>
          <div className="mt-8 text-red-500 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center">
            Select Mode <span className="ml-2">→</span>
          </div>
        </Card>
      </div>
      
      <div className="mt-16 text-center text-sm text-gray-400">
        Powered by Google Gemini 2.5 Flash • React • Tailwind CSS
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setMode(AnalysisMode.NONE)}
          >
            <div className="bg-gradient-to-br from-primary to-secondary w-8 h-8 rounded-lg"></div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Visionary</span>
          </div>
          {mode !== AnalysisMode.NONE && (
             <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
               {mode === AnalysisMode.IMAGE ? 'Image Mode' : mode === AnalysisMode.VIDEO ? 'Video Mode' : 'Live Mode'}
             </span>
          )}
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8">
        {mode === AnalysisMode.NONE && renderWelcome()}
        {mode === AnalysisMode.IMAGE && <ImageAnalyzer onBack={() => setMode(AnalysisMode.NONE)} />}
        {mode === AnalysisMode.VIDEO && <VideoAnalyzer onBack={() => setMode(AnalysisMode.NONE)} />}
        {mode === AnalysisMode.WEBCAM && <WebcamAnalyzer onBack={() => setMode(AnalysisMode.NONE)} />}
      </main>
    </div>
  );
};

export default App;