import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import YoutubePlayer from "react-native-youtube-iframe";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { extractAnglesFromLandmarks, generatePoseFeedback, smoothScore, checkPoseHold } from "../utils/poseUtils";
import { getPoseTemplate } from "../utils/poseTemplates";
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get("window");
const API_URL = "http://192.168.1.5:5000"; // Update with your backend URL

export default function YogaSessionScreen({ route, navigation }) {
  const { yogaPlan = [], sessionId } = route?.params || {};
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const currentPose = yogaPlan[currentPoseIndex];

  // Camera states
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);

  // Pose detection states
  const [poseScore, setPoseScore] = useState(0);
  const [feedback, setFeedback] = useState({ overall: "Position yourself in camera view", details: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [poseTemplate, setPoseTemplate] = useState(null);

  // Video states
  const [videoId, setVideoId] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Session tracking
  const [poseStartTime, setPoseStartTime] = useState(null);
  const [poseHoldDuration, setPoseHoldDuration] = useState(0);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [poseCompleted, setPoseCompleted] = useState(false);

  // Processing interval
  const processingInterval = useRef(null);
  const holdCheckInterval = useRef(null);

  /* ===============================
     CAMERA PERMISSION
  =============================== */
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  /* ===============================
     LOAD POSE TEMPLATE
  =============================== */
  useEffect(() => {
    if (currentPose) {
      const template = getPoseTemplate(currentPose.id);
      setPoseTemplate(template);
      setPoseCompleted(false);
      setPoseScore(0);
      setScoreHistory([]);
      setPoseStartTime(Date.now());
      setFeedback({ overall: "Get into position", details: [] });
    }
  }, [currentPose]);

  /* ===============================
     FETCH YOUTUBE VIDEO
  =============================== */
  useEffect(() => {
    if (currentPose?.id) {
      fetchVideo();
    } else {
      setVideoId(null);
      setLoadingVideo(false);
    }
  }, [currentPose]);

  const fetchVideo = async () => {
    if (!currentPose?.id) {
      setVideoId(null);
      setLoadingVideo(false);
      return;
    }

    setLoadingVideo(true);
    try {
      const res = await fetch(`${API_URL}/api/yoga/youtube?pose=${currentPose.id}`);
      const data = await res.json();
      setVideoId(res.ok ? data?.videoId ?? null : null);
    } catch (err) {
      console.log("Video fetch error:", err);
      setVideoId(null);
    } finally {
      setLoadingVideo(false);
    }
  };

  /* ===============================
     POSE DETECTION LOOP
  =============================== */
  useEffect(() => {
    if (cameraReady && !poseCompleted) {
      startPoseDetection();
    }

    return () => {
      if (processingInterval.current) {
        clearInterval(processingInterval.current);
      }
      if (holdCheckInterval.current) {
        clearInterval(holdCheckInterval.current);
      }
    };
  }, [cameraReady, poseCompleted]);

  const startPoseDetection = () => {
    // Process frames every 2 seconds (to avoid overwhelming the backend)
    processingInterval.current = setInterval(() => {
      captureAndAnalyzePose();
    }, 2000);

    // Check pose hold every second
    holdCheckInterval.current = setInterval(() => {
      if (poseStartTime) {
        const duration = Math.floor((Date.now() - poseStartTime) / 1000);
        setPoseHoldDuration(duration);
      }
    }, 1000);
  };

  const captureAndAnalyzePose = async () => {
    if (!cameraRef.current || isProcessing || poseCompleted) return;

    setIsProcessing(true);

    try {
      // Capture photo from camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        skipProcessing: true,
      });

      // Resize image for faster processing
      const resizedPhoto = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Send to backend for pose detection
      await analyzePoseWithBackend(resizedPhoto.uri);

    } catch (error) {
      console.error("Pose capture error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzePoseWithBackend = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'pose.jpg',
      });
      formData.append('poseId', currentPose?.id || '');

      const response = await fetch(`${API_URL}/api/pose/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.success && data.detected && data.validation) {
        const newScore = data.validation.score;
        const smoothedScore = scoreHistory.length > 0 
          ? smoothScore(poseScore, newScore, 0.7)
          : newScore;

        setPoseScore(smoothedScore);
        setScoreHistory(prev => [...prev, smoothedScore].slice(-5)); // Keep last 5 scores

        // Generate feedback
        const feedbackData = {
          overall: data.validation.feedback.length > 0 
            ? data.validation.feedback[0].message 
            : "Great form!",
          details: data.validation.feedback,
          score: smoothedScore
        };
        setFeedback(feedbackData);

        // Check if pose is held correctly
        if (smoothedScore >= 85 && !poseCompleted) {
          const recentScores = [...scoreHistory, smoothedScore].slice(-3);
          if (recentScores.length >= 3 && recentScores.every(s => s >= 85)) {
            completePose(smoothedScore, feedbackData, data.validation.angles);
          }
        }
      } else {
        setFeedback({ 
          overall: "Position yourself in camera view", 
          details: [] 
        });
      }
    } catch (error) {
      console.error("Backend analysis error:", error);
    }
  };

  const completePose = async (finalScore, feedbackData, angles) => {
    setPoseCompleted(true);
    
    // Clear intervals
    if (processingInterval.current) clearInterval(processingInterval.current);
    if (holdCheckInterval.current) clearInterval(holdCheckInterval.current);

    const duration = Math.floor((Date.now() - poseStartTime) / 1000);

    // Update backend
    try {
      await fetch(`${API_URL}/api/session/updatePose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          poseScore: finalScore,
          poseId: currentPose?.id,
          feedback: feedbackData.details,
          angles: angles,
          duration: duration,
        }),
      });

      // Show completion message
      Alert.alert(
        "Pose Completed! 🎉",
        `Great job! Score: ${Math.round(finalScore)}%\nDuration: ${duration}s`,
        [
          {
            text: "Next Pose",
            onPress: () => moveToNextPose(),
          },
        ]
      );
    } catch (error) {
      console.error("Session update error:", error);
    }
  };

  const moveToNextPose = () => {
    if (currentPoseIndex < yogaPlan.length - 1) {
      setCurrentPoseIndex(currentPoseIndex + 1);
    } else {
      // Session complete
      Alert.alert(
        "Session Complete! 🎊",
        "You've completed all poses in this session!",
        [
          {
            text: "View Summary",
            onPress: () => navigation.navigate("Feedback", { sessionId }),
          },
        ]
      );
    }
  };

  const skipPose = () => {
    Alert.alert(
      "Skip Pose?",
      "Are you sure you want to skip this pose?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Skip", onPress: () => moveToNextPose() },
      ]
    );
  };

  /* ===============================
     RENDER UI
  =============================== */
  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF7F50" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#999" />
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>Please enable camera access in settings</Text>
      </View>
    );
  }

  if (!currentPose) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#999" />
        <Text style={styles.errorText}>No yoga poses available</Text>
        <Text style={styles.errorSubtext}>Please generate a yoga plan before starting the session.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Pose {currentPoseIndex + 1} of {yogaPlan.length}
          </Text>
          <TouchableOpacity onPress={skipPose} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Pose Name */}
        <View style={styles.poseNameCard}>
          <Text style={styles.poseName}>{poseTemplate?.name || currentPose.id}</Text>
          <View style={styles.durationBadge}>
            <MaterialCommunityIcons name="timer-outline" size={16} color="#FF7F50" />
            <Text style={styles.durationText}>{currentPose.duration}s</Text>
          </View>
        </View>

        {/* Reference Video */}
        <View style={styles.videoContainer}>
          {loadingVideo ? (
            <ActivityIndicator size="large" color="#FF7F50" />
          ) : videoId ? (
            <YoutubePlayer
              height={220}
              play={isPlaying}
              videoId={videoId}
              onChangeState={(state) => setIsPlaying(state === "playing")}
            />
          ) : (
            <Text style={styles.noVideoText}>No reference video available</Text>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Instructions</Text>
          {poseTemplate?.instructions?.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>

        {/* Camera Feed */}
        <View style={styles.cameraCard}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            onCameraReady={() => setCameraReady(true)}
          />
          <View pointerEvents="none" style={styles.cameraOverlay}>
            {isProcessing && (
              <View style={styles.processingBadge}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.processingText}>Analyzing...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Live Feedback */}
        <View style={styles.feedbackCard}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{Math.round(poseScore)}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
            <View style={styles.durationInfo}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
              <Text style={styles.durationValue}>{poseHoldDuration}s</Text>
            </View>
          </View>

          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackOverall}>{feedback.overall}</Text>
            {feedback.details && feedback.details.length > 0 && (
              <View style={styles.detailsList}>
                {feedback.details.slice(0, 3).map((detail, index) => (
                  <View key={index} style={styles.detailItem}>
                    <MaterialCommunityIcons 
                      name={detail.severity === 'high' ? 'alert-circle' : 'information'} 
                      size={16} 
                      color={detail.severity === 'high' ? '#F44336' : '#FF9800'} 
                    />
                    <Text style={styles.detailText}>{detail.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {poseScore >= 85 && (
            <View style={styles.successBanner}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>Hold this position!</Text>
            </View>
          )}
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8F3",
    padding: 20,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: "#FF7F50",
    fontWeight: "600",
  },
  poseNameCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  poseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  durationText: {
    marginLeft: 4,
    color: "#FF7F50",
    fontWeight: "600",
  },
  videoContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#000",
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  noVideoText: {
    color: "#fff",
    fontSize: 14,
  },
  instructionCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  instructionTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
    color: "#1A1A1A",
  },
  instructionRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bulletPoint: {
    marginRight: 8,
    color: "#FF7F50",
    fontWeight: "bold",
  },
  instructionText: {
    flex: 1,
    color: "#555",
    lineHeight: 20,
  },
  cameraCard: {
    height: width * 1.2,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    padding: 16,
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  processingText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 12,
  },
  feedbackCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF0EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FF7F50",
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF7F50",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  durationInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  feedbackContent: {
    marginBottom: 12,
  },
  feedbackOverall: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  detailsList: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 13,
    flex: 1,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  successText: {
    marginLeft: 8,
    color: "#4CAF50",
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});

// Made with Bob
