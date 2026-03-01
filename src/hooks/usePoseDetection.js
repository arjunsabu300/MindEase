import { useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";

export const usePoseDetection = () => {
  const [landmarks, setLandmarks] = useState(null);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    pose.onResults((results) => {
      if (results.poseLandmarks) {
        setLandmarks(results.poseLandmarks);
      }
    });

    return () => pose.close();
  }, []);

  return landmarks;
};