export enum AnalysisMode {
  NONE = 'NONE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  WEBCAM = 'WEBCAM'
}

export interface DetectedObject {
  name: string;
  confidence: "High" | "Medium" | "Low";
  box_2d: number[]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

export interface ImageAnalysisResult {
  objects: DetectedObject[];
  narrative: string;
}

export interface VideoFrameAnalysis {
  timestamp: string; // e.g., "00:03"
  analysis: string;
}

export interface VideoAnalysisResult {
  frames: VideoFrameAnalysis[];
  finalReport: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}