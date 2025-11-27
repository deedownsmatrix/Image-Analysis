export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export interface ExtractedFrame {
  timestamp: number;
  base64: string;
}

/**
 * Simulates OpenCV-like frame extraction using standard HTML5 Video and Canvas APIs.
 * Extracts a frame every 3 seconds, up to 10 frames max.
 */
export const extractFramesFromVideo = async (
  file: File,
  onProgress: (percent: number) => void
): Promise<ExtractedFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: ExtractedFrame[] = [];
    const url = URL.createObjectURL(file);

    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    // Wait for metadata to know duration and dimensions
    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      
      // Strategy: 0s, 3s, 6s... max 10 frames
      const interval = 3;
      const maxFrames = 10;
      let currentTime = 0;
      let frameCount = 0;

      const captureFrame = async () => {
        if (currentTime > duration || frameCount >= maxFrames) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }

        // Seek to time
        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          frames.push({
            timestamp: currentTime,
            base64: dataUrl.split(',')[1],
          });
          
          frameCount++;
          currentTime += interval;
          
          // Update progress
          const progress = Math.min(100, Math.round((frameCount / maxFrames) * 100));
          onProgress(progress);

          captureFrame();
        } else {
          reject(new Error("Could not get canvas context"));
        }
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };

      // Start capturing
      captureFrame();
    };

    video.onerror = () => {
      reject(new Error("Failed to load video file"));
    };
  });
};