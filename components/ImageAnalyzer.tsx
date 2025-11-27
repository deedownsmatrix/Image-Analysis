import React, { useState, useMemo } from 'react';
import { Button, Card, Spinner } from './UI';
import { GeminiService } from '../services/geminiService';
import { ImageAnalysisResult, ProcessingStatus } from '../types';
import { fileToBase64 } from '../utils/mediaUtils';

// Predefined distinct colors for bounding boxes
const BOX_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export const ImageAnalyzer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('image/')) {
        setError("Please upload a valid image file (JPEG/PNG).");
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
      setStatus(ProcessingStatus.IDLE);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setStatus(ProcessingStatus.ANALYZING);
      setError(null);
      
      const base64 = await fileToBase64(file);
      const data = await GeminiService.analyzeImage(base64);
      
      setResult(data);
      setStatus(ProcessingStatus.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze image. Please try again.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  // Aggregate individual detected objects for the summary table
  const aggregatedObjects = useMemo(() => {
    if (!result) return [];
    
    const counts: Record<string, { count: number; confidence: string; colorIndex: number }> = {};
    
    // Assign a consistent color to each unique object name for this session
    const nameColorMap: Record<string, number> = {};
    let colorCounter = 0;

    result.objects.forEach(obj => {
      const name = obj.name;
      
      if (nameColorMap[name] === undefined) {
        nameColorMap[name] = colorCounter % BOX_COLORS.length;
        colorCounter++;
      }

      if (!counts[name]) {
        counts[name] = { 
          count: 0, 
          confidence: obj.confidence,
          colorIndex: nameColorMap[name]
        };
      }
      counts[name].count++;
      // Optional: Logic to average confidence could go here, 
      // but keeping the first/dominant confidence is usually fine for summary.
    });

    return Object.entries(counts).map(([name, data]) => ({
      name,
      ...data
    }));
  }, [result]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2">
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Static Image Analysis</h2>
      </div>

      <Card>
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
            {preview && !result ? (
              <img src={preview} alt="Preview" className="max-h-64 object-contain rounded-lg shadow-sm mb-4" />
            ) : !preview ? (
              <div className="text-gray-400 mb-4">
                 <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
            ) : null}
            
            {!result && (
              <>
                <span className="text-indigo-600 font-medium text-lg">
                  {file ? "Change Image" : "Upload Image to Analyze"}
                </span>
                <span className="text-gray-400 text-sm mt-1">JPEG or PNG supported</span>
              </>
            )}
          </label>
        </div>

        {/* Action Button */}
        {file && status !== ProcessingStatus.COMPLETE && status !== ProcessingStatus.ANALYZING && (
          <div className="mt-6 flex justify-center">
            <Button onClick={handleAnalyze} className="w-full md:w-auto min-w-[200px]">
              Analyze Image
            </Button>
          </div>
        )}

        {/* Loading State */}
        {status === ProcessingStatus.ANALYZING && (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4">
            <Spinner size="lg" />
            <p className="text-gray-600 font-medium">Identifying objects and coordinates...</p>
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

      {/* Results Display */}
      {result && preview && (
        <div className="space-y-6 animate-fade-in-up">
          
          {/* Visual Analysis Card */}
          <Card className="overflow-hidden">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              Object Detection
            </h3>
            
            <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
               <img src={preview} alt="Analyzed" className="w-full h-auto block" />
               {result.objects.map((obj, i) => {
                 // Gemini returns [ymin, xmin, ymax, xmax] on a 0-1000 scale
                 const [ymin, xmin, ymax, xmax] = obj.box_2d;
                 
                 // Get color based on object name
                 const color = BOX_COLORS[aggregatedObjects.find(a => a.name === obj.name)?.colorIndex || 0];
                 
                 return (
                   <div
                     key={i}
                     className="absolute border-2 flex items-start group hover:z-10 transition-all"
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
                       className="absolute -top-7 left-[-2px] text-xs font-bold text-white px-2 py-1 rounded shadow-sm whitespace-nowrap opacity-90 group-hover:opacity-100"
                       style={{ backgroundColor: color }}
                     >
                        {obj.name}
                     </span>
                   </div>
                 );
               })}
            </div>
            <p className="text-sm text-gray-400 mt-2 text-right">Bounding boxes normalized from Gemini vision analysis.</p>
          </Card>

          {/* Narrative Card */}
          <Card className="border-l-4 border-l-primary">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Analysis Narrative
            </h3>
            <p className="text-gray-700 leading-relaxed text-lg">
              {result.narrative}
            </p>
          </Card>

          {/* Structured Data Card */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
              Identified Objects Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Object</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aggregatedObjects.map((obj, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BOX_COLORS[obj.colorIndex] }}></div>
                         {obj.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{obj.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${obj.confidence === 'High' ? 'bg-green-100 text-green-800' : 
                            obj.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {obj.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};