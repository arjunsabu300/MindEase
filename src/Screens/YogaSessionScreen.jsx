import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";
import YoutubePlayer from "react-native-youtube-iframe";
import { calculateAngle, calculatePoseScore } from "../utils/poseUtils";
import { poseTemplates } from "../utils/poseTemplates";
import { usePoseDetection } from "../hooks/usePoseDetection";

const { width } = Dimensions.get("window");

export default function YogaSessionScreen({ route }) {
  const { yogaPlan, sessionId } = route.params;
  const pose = yogaPlan[0];

  const devices = useCameraDevices();
  const device = devices.front;

  const landmarks = usePoseDetection();

  const [poseScore, setPoseScore] = useState(0);
  const [feedback, setFeedback] = useState("Align your body properly.");
  const [videoId, setVideoId] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [poseConfirmed, setPoseConfirmed] = useState(false);

  /* ===============================
     CAMERA PERMISSION
  =============================== */
  useEffect(() => {
    const requestPermission = async () => {
      const permission = await Camera.requestCameraPermission();
      if (permission !== "authorized") {
        console.log("Camera permission denied");
      }
    };
    requestPermission();
  }, []);

  /* ===============================
     FETCH YOUTUBE VIDEO
  =============================== */
  useEffect(() => {
    fetchVideo();
  }, []);

  const fetchVideo = async () => {
    try {
      const res = await fetch(
        `http://192.168.1.6:5000/api/yoga/youtube?pose=${pose.id}`
      );
      const data = await res.json();
      setVideoId(data.videoId);
    } catch (err) {
      console.log("Video fetch error:", err);
    } finally {
      setLoadingVideo(false);
    }
  };

  /* ===============================
     POSTURE CALCULATION LOGIC
  =============================== */
  useEffect(() => {
    if (!landmarks || !poseTemplates[pose.id]) return;

    const reference = poseTemplates[pose.id];

    try {
      const leftKnee = calculateAngle(
        landmarks[23],
        landmarks[25],
        landmarks[27]
      );

      const rightKnee = calculateAngle(
        landmarks[24],
        landmarks[26],
        landmarks[28]
      );

      const userAngles = { leftKnee, rightKnee };
      const score = calculatePoseScore(userAngles, reference);

      const smoothedScore = poseScore * 0.7 + score * 0.3;
      setPoseScore(smoothedScore);

      if (Math.abs(leftKnee - reference.leftKnee) > 20) {
        setFeedback("Adjust your left knee angle slightly.");
      } else if (Math.abs(rightKnee - reference.rightKnee) > 20) {
        setFeedback("Adjust your right knee angle slightly.");
      } else {
        setFeedback("Perfect posture 🔥 Hold steady!");
      }

    } catch (err) {
      console.log("Angle calculation error:", err);
    }

  }, [landmarks]);

  /* ===============================
     AUTO BACKEND UPDATE
  =============================== */
  useEffect(() => {
    if (poseScore > 85 && !poseConfirmed) {
      setPoseConfirmed(true);
      updateSession();
    }
  }, [poseScore]);

  const updateSession = async () => {
    try {
      await fetch(`http://192.168.1.6:5000/api/session/updatePose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          poseScore,
          completionRatio: poseScore / 100,
        }),
      });
      console.log("Session updated");
    } catch (err) {
      console.log("Session update failed:", err);
    }
  };

  /* ===============================
     RENDER UI
  =============================== */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* 1️⃣ YOGA VIDEO */}
        <View style={styles.videoContainer}>
          {loadingVideo ? (
            <ActivityIndicator size="large" color="#FF7F50" />
          ) : videoId ? (
            <YoutubePlayer
              height={220}
              play={true}
              videoId={videoId}
            />
          ) : (
            <Text>No reference video available.</Text>
          )}
        </View>

        {/* 2️⃣ INSTRUCTION SECTION */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Instructions</Text>
          <Text style={styles.instructionText}>
            Follow the pose shown above. Keep your spine aligned and knees stable.
            Focus on breathing steadily while holding the posture.
          </Text>
        </View>

        {/* 3️⃣ CAMERA FEED */}
        <View style={styles.cameraCard}>
          {device && (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
            />
          )}
        </View>

        {/* 4️⃣ LIVE POSE UPDATE */}
        <View style={styles.feedbackCard}>
          <Text style={styles.scoreText}>
            Accuracy: {poseScore.toFixed(0)}%
          </Text>
          <Text style={styles.feedbackText}>
            {feedback}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ===============================
   STYLES
================================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F3",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  videoContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  instructionCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  instructionTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
  instructionText: {
    color: "#555",
    lineHeight: 20,
  },
  cameraCard: {
    height: width * 1.2,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 20,
  },
  feedbackCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00AA66",
  },
  feedbackText: {
    marginTop: 6,
    color: "#444",
  },
});