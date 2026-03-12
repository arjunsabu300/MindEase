import { useEffect, useState, useRef } from "react";

/**
 * Custom hook for pose detection using Expo Camera
 * This hook processes camera frames and detects body pose landmarks
 * 
 * Note: For Expo, we need to use expo-camera with frame processors
 * MediaPipe Pose works in web environments, but for React Native/Expo,
 * we need to use TensorFlow Lite or a similar solution
 */

export const usePoseDetection = (isActive = true) => {
  const [landmarks, setLandmarks] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const processingRef = useRef(false);

  // For Expo compatibility, we'll use a frame processor approach
  // This will be called from the camera component
  const processFrame = async (frame) => {
    if (!isActive || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      // In a real implementation, you would:
      // 1. Convert frame to base64 or blob
      // 2. Send to backend for pose detection
      // 3. Or use TensorFlow Lite model locally
      
      // For now, we'll simulate the landmark structure
      // In production, replace this with actual pose detection
      
      // This is a placeholder - actual implementation would use:
      // - TensorFlow Lite with PoseNet/MoveNet
      // - Or send frames to backend with MediaPipe
      
      setError(null);
    } catch (err) {
      console.error("Pose detection error:", err);
      setError(err.message);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Process landmarks from backend or local model
  const updateLandmarks = (newLandmarks) => {
    if (newLandmarks && Array.isArray(newLandmarks)) {
      setLandmarks(newLandmarks);
    }
  };

  // Reset detection
  const reset = () => {
    setLandmarks(null);
    setError(null);
    setIsProcessing(false);
  };

  return {
    landmarks,
    isProcessing,
    error,
    processFrame,
    updateLandmarks,
    reset
  };
};

/**
 * Hook for continuous pose tracking with frame rate control
 */
export const useContinuousPoseDetection = (frameRate = 5) => {
  const [landmarks, setLandmarks] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const lastProcessTime = useRef(0);
  const frameInterval = 1000 / frameRate; // Convert FPS to milliseconds

  const shouldProcessFrame = () => {
    const now = Date.now();
    if (now - lastProcessTime.current >= frameInterval) {
      lastProcessTime.current = now;
      return true;
    }
    return false;
  };

  const processFrameWithRateLimit = async (frameData) => {
    if (!shouldProcessFrame()) {
      return;
    }

    try {
      // Process frame and update landmarks
      // This would call your pose detection service
      setIsReady(true);
    } catch (error) {
      console.error("Frame processing error:", error);
    }
  };

  return {
    landmarks,
    isReady,
    processFrameWithRateLimit,
    updateLandmarks: setLandmarks
  };
};

/**
 * Hook for pose detection via backend API
 * This is more suitable for Expo as it doesn't require native modules
 */
export const useBackendPoseDetection = (apiUrl) => {
  const [landmarks, setLandmarks] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const detectPoseFromImage = async (imageUri) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'pose.jpg',
      });

      const response = await fetch(`${apiUrl}/api/pose/detect`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Pose detection failed');
      }

      const data = await response.json();
      
      if (data.landmarks) {
        setLandmarks(data.landmarks);
      }

      return data;
    } catch (err) {
      console.error('Backend pose detection error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    landmarks,
    isProcessing,
    error,
    detectPoseFromImage,
    setLandmarks
  };
};

/**
 * Mock pose detection for testing
 * Generates sample landmarks for development
 */
export const useMockPoseDetection = (poseType = 'standing') => {
  const [landmarks, setLandmarks] = useState(null);

  useEffect(() => {
    // Generate mock landmarks based on pose type
    const mockLandmarks = generateMockLandmarks(poseType);
    setLandmarks(mockLandmarks);
  }, [poseType]);

  return { landmarks, setLandmarks };
};

// Helper function to generate mock landmarks
const generateMockLandmarks = (poseType) => {
  // Create 33 landmarks (MediaPipe Pose standard)
  const landmarks = Array(33).fill(null).map((_, index) => ({
    x: 0.5 + (Math.random() - 0.5) * 0.3,
    y: 0.3 + (index / 33) * 0.6,
    z: 0,
    visibility: 0.9
  }));

  // Adjust based on pose type
  if (poseType === 'standing') {
    // Legs straight
    landmarks[25].y = 0.7; // left knee
    landmarks[26].y = 0.7; // right knee
    landmarks[27].y = 0.9; // left ankle
    landmarks[28].y = 0.9; // right ankle
  } else if (poseType === 'sitting') {
    // Legs bent
    landmarks[25].y = 0.6;
    landmarks[26].y = 0.6;
    landmarks[27].y = 0.7;
    landmarks[28].y = 0.7;
  }

  return landmarks;
};

// Made with Bob
