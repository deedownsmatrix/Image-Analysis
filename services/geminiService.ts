import { GoogleGenAI, Type } from "@google/genai";
import { withExponentialBackoff } from "../utils/retry";
import { ImageAnalysisResult, VideoAnalysisResult, VideoFrameAnalysis } from "../types";
import { formatTime } from "../utils/mediaUtils";

// NOTE: API Key is accessed via process.env.API_KEY
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-ts-check' });

// Model constant requested in prompt
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

export const GeminiService = {
  /**
   * Analyzes a static image.
   * Returns a structured JSON object with identified objects and a narrative.
   */
  analyzeImage: async (base64Image: string): Promise<ImageAnalysisResult> => {
    return withExponentialBackoff(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: "Analyze this image. Identify all key objects. For each detected object instance, return the name, confidence level, and its bounding box.",
            },
          ],
        },
        config: {
          systemInstruction: "You are an Expert Vision Analyst. Identify objects and return bounding boxes. Coordinates for box_2d are [ymin, xmin, ymax, xmax] on a 0-1000 integer scale.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              objects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                    box_2d: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                      description: "Bounding box coordinates [ymin, xmin, ymax, xmax] on a 0-1000 scale",
                    }
                  },
                  required: ["name", "confidence", "box_2d"],
                },
              },
              narrative: { type: Type.STRING },
            },
            required: ["objects", "narrative"],
          },
        },
      });

      if (!response.text) throw new Error("No response from Gemini");
      return JSON.parse(response.text) as ImageAnalysisResult;
    });
  },

  /**
   * Analyzes video frames sequentially using a Chat session to maintain context.
   */
  analyzeVideoFrames: async (
    frames: { timestamp: number; base64: string }[],
    onFrameAnalyzed: (result: VideoFrameAnalysis) => void
  ): Promise<VideoAnalysisResult> => {
    // 1. Initialize Chat
    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: "You are an Expert Video Analyst. You will receive a sequence of video keyframes. For each frame, identify the objects and strictly note any changes from the previous frame's analysis. Be concise.",
      },
    });

    const frameResults: VideoFrameAnalysis[] = [];

    // 2. Process frames sequentially
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const timeStr = formatTime(frame.timestamp);
      
      const prompt = i === 0 
        ? `Frame at ${timeStr}. Identify objects and describe the initial scene.` 
        : `Frame at ${timeStr}. Identify objects and note any changes (movement, appearance, disappearance) compared to previous frames.`;

      const analysisText = await withExponentialBackoff(async () => {
        // Fix: Use 'message' property instead of 'parts' directly for chat.sendMessage
        const result = await chat.sendMessage({
          message: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: frame.base64,
              },
            },
            { text: prompt },
          ],
        });
        return result.text;
      });

      const frameResult = {
        timestamp: timeStr,
        analysis: analysisText || "No analysis provided.",
      };
      
      frameResults.push(frameResult);
      onFrameAnalyzed(frameResult);
    }

    // 3. Generate Final Report
    const finalReportText = await withExponentialBackoff(async () => {
      // Fix: Use 'message' property
      const result = await chat.sendMessage({
        message: "Create a final, cohesive Video Analysis Report summarizing the progression of the scene, key actions, and object movements based on all processed frames.",
      });
      return result.text;
    });

    return {
      frames: frameResults,
      finalReport: finalReportText || "Could not generate final report.",
    };
  },
};