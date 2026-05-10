import React, { useEffect, useState, useRef, useCallback } from "react";
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
  Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import YoutubePlayer from "react-native-youtube-iframe";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { smoothScore } from "../utils/poseUtils";
import { getPoseTemplate } from "../utils/poseTemplates";
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get("window");
const API_URL = "https://mindease-iig7.onrender.com";

export default function YogaSessionScreen({ route, navigation }) {
  const { yogaPlan = [], sessionId } = route?.params || {};
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const currentPose = yogaPlan[currentPoseIndex];

  // Camera states
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);

  // Pose detection states
  const [poseScore, setPoseScore] = useState(0);
  const [feedback, setFeedback] = useState({ overall: "Watch the video to learn the pose", details: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [poseTemplate, setPoseTemplate] = useState(null);

  // Video states
  const [videoId, setVideoId] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  // Session flow states
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Session tracking
  const [poseStartTime, setPoseStartTime] = useState(null);
  const [poseHoldDuration, setPoseHoldDuration] = useState(0);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [poseCompleted, setPoseCompleted] = useState(false);

  // Processing interval - for live tracking
  const processingInterval = useRef(null);
  const holdCheckInterval = useRef(null);
  const lastProcessTime = useRef(0);
  const completionInProgress = useRef(false);
  const latestPoseScore = useRef(0);
  const latestFeedback = useRef({ overall: "Watch the video to learn the pose", details: [] });

  /* ===============================
     CAMERA PERMISSION
  =============================== */
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
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
      setVideoWatched(false);
      setSessionStarted(false);
      setShowReadyModal(false);
      setPoseStartTime(null);
      setPoseHoldDuration(0);
      setCameraReady(false);
      completionInProgress.current = false;
      setFeedback({ overall: "Watch the video to learn the pose", details: [] });
    }
  }, [currentPose]);

  useEffect(() => {
    latestPoseScore.current = poseScore;
  }, [poseScore]);

  useEffect(() => {
    latestFeedback.current = feedback;
  }, [feedback]);

  /* ===============================
     FETCH YOUTUBE VIDEO
  =============================== */
  useEffect(() => {
    if (currentPose?.id) {
      fetchVideo();
    }
  }, [currentPose]);

  const fetchVideo = async () => {
    if (!currentPose?.id) {
      setLoadingVideo(false);
      return;
    }

    setLoadingVideo(true);
    try {
      const res = await fetch(`${API_URL}/api/yoga/youtube?pose=${currentPose.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch video');
      }
      const data = await res.json();
      if (data.videoId) {
        setVideoId(data.videoId);
      } else {
        setVideoId(null);
      }
    } catch (err) {
      console.log("Video fetch error:", err);
      setVideoId(null);
    } finally {
      setLoadingVideo(false);
    }
  };

  /* ===============================
     VIDEO STATE CHANGE HANDLER
  =============================== */
  const onVideoStateChange = useCallback((state) => {
    if (state === "ended") {
      setVideoWatched(true);
      setIsPlaying(false);
    } else if (state === "playing") {
      setIsPlaying(true);
    } else if (state === "paused") {
      setIsPlaying(false);
    }
  }, []);

  /* ===============================
     READY MODAL HANDLER
  =============================== */
  const handleVideoComplete = () => {
    setShowReadyModal(true);
  };

  const handleLetsGetStarted = () => {
    setShowReadyModal(false);
    setSessionStarted(true);
    setPoseStartTime(Date.now());
    setPoseHoldDuration(0);
    completionInProgress.current = false;
    setFeedback({ overall: "Position yourself in camera view", details: [] });
  };

  const handleNotReady = () => {
    setShowReadyModal(false);
    // User can watch video again
  };

  /* ===============================
     LIVE POSE DETECTION
  =============================== */
  useEffect(() => {
    if (sessionStarted && cameraReady && !poseCompleted) {
      startLiveTracking();
    }

    return () => {
      clearTrackingIntervals();
    };
  }, [sessionStarted, cameraReady, poseCompleted]);

  const clearTrackingIntervals = () => {
    if (processingInterval.current) {
      clearInterval(processingInterval.current);
      processingInterval.current = null;
    }
    if (holdCheckInterval.current) {
      clearInterval(holdCheckInterval.current);
      holdCheckInterval.current = null;
    }
  };

  const startLiveTracking = () => {
    clearTrackingIntervals();

    // Process frames every 3 seconds to reduce shutter sound frequency
    // This is a compromise between real-time feedback and user experience
    processingInterval.current = setInterval(() => {
      captureAndAnalyzePose();
    }, 3000); // Increased from 1.5s to 3s

    // Check pose hold every second
    holdCheckInterval.current = setInterval(() => {
      if (poseStartTime) {
        const duration = Math.floor((Date.now() - poseStartTime) / 1000);
        setPoseHoldDuration(duration);

        if (currentPose?.duration && duration >= currentPose.duration && !completionInProgress.current) {
          finalizeCurrentPose({
            finalScore: latestPoseScore.current,
            feedbackData: latestFeedback.current,
            angles: null,
            shouldAlert: false,
          });
        }
      }
    }, 1000);
  };

  const captureAndAnalyzePose = async () => {
    if (!cameraRef.current || isProcessing || poseCompleted) return;

    // Throttle processing to avoid overwhelming
    const now = Date.now();
    if (now - lastProcessTime.current < 1000) return;
    lastProcessTime.current = now;

    setIsProcessing(true);

    try {
      // Capture frame with minimal settings
      // Note: Expo Camera doesn't support muting shutter sound on all devices
      // The sound is controlled by device system settings
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3, // Lower quality for faster capture
        base64: false,
        skipProcessing: true,
        exif: false,
        isImageMirror: false,
      });

      // Resize image for faster processing
      const resizedPhoto = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 480 } }], // Smaller for faster processing
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
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
      formData.append('poseId', currentPose.id);

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
        setScoreHistory(prev => [...prev, smoothedScore].slice(-5));

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
            finalizeCurrentPose({
              finalScore: smoothedScore,
              feedbackData,
              angles: data.validation.angles,
              shouldAlert: true,
            });
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
      setFeedback({ 
        overall: "Analyzing your pose...", 
        details: [] 
      });
    }
  };

  const finalizeCurrentPose = async ({
    finalScore = 0,
    feedbackData = feedback,
    angles = null,
    shouldAlert = false,
  } = {}) => {
    if (completionInProgress.current) {
      return;
    }

    completionInProgress.current = true;
    setPoseCompleted(true);
    clearTrackingIntervals();

    const duration = poseStartTime ? Math.floor((Date.now() - poseStartTime) / 1000) : poseHoldDuration;

    try {
      await fetch(`${API_URL}/api/session/updatePose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          poseScore: finalScore,
          poseId: currentPose.id,
          feedback: feedbackData?.details || [],
          angles: angles,
          duration: duration,
        }),
      });

      if (shouldAlert) {
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
      }
    } catch (error) {
      console.error("Session update error:", error);
      if (shouldAlert) {
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
      }
    }

    if (!shouldAlert) {
      moveToNextPose();
    }
  };

  const moveToNextPose = () => {
    clearTrackingIntervals();
    completionInProgress.current = false;
    if (currentPoseIndex < yogaPlan.length - 1) {
      setCurrentPoseIndex((prev) => prev + 1);
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

  const handleNextPress = () => {
    Alert.alert(
      "Move to Next Exercise?",
      "This will finish the current exercise and move to the next one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Next",
          onPress: () =>
            finalizeCurrentPose({
              finalScore: poseScore,
              feedbackData: feedback,
              angles: null,
              shouldAlert: false,
            }),
        },
      ]
    );
  };

  const handleStopSession = () => {
    Alert.alert(
      "Stop Session?",
      "This will terminate the current yoga session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => {
            clearTrackingIntervals();
            completionInProgress.current = false;
            navigation.goBack();
          },
        },
      ]
    );
  };

  /* ===============================
     RENDER UI
  =============================== */
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF7F50" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#999" />
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>Please enable camera access in settings</Text>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={requestPermission}
        >
          <Text style={styles.proceedButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentPose) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No yoga poses available</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Pose {currentPoseIndex + 1} of {yogaPlan.length}
          </Text>
          <TouchableOpacity onPress={skipPose} style={styles.headerButton}>
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
        {!sessionStarted && (
          <View style={styles.videoContainer}>
            {loadingVideo ? (
              <View style={styles.videoLoading}>
                <ActivityIndicator size="large" color="#FF7F50" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            ) : videoId ? (
              <>
                <YoutubePlayer
                  height={220}
                  play={isPlaying}
                  videoId={videoId}
                  onChangeState={onVideoStateChange}
                />
                {videoWatched && (
                  <TouchableOpacity 
                    style={styles.readyButton}
                    onPress={handleVideoComplete}
                  >
                    <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
                    <Text style={styles.readyButtonText}>I'm Ready!</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noVideoContainer}>
                <MaterialCommunityIcons name="video-off" size={48} color="#999" />
                <Text style={styles.noVideoText}>No reference video available</Text>
                <TouchableOpacity 
                  style={styles.proceedButton}
                  onPress={handleVideoComplete}
                >
                  <Text style={styles.proceedButtonText}>Proceed Anyway</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Instructions */}
        {!sessionStarted && (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Instructions</Text>
            {poseTemplate?.instructions?.map((instruction, index) => (
              <View key={index} style={styles.instructionRow}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Camera Feed - Only show when session started */}
        {sessionStarted && (
          <>
            <View style={styles.cameraCard}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                onCameraReady={() => setCameraReady(true)}
                enableTorch={false}
              />
              {/* Overlay - positioned absolutely outside CameraView */}
              <View style={styles.cameraOverlay}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE TRACKING</Text>
                </View>
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

              <View style={styles.sessionActionRow}>
                <TouchableOpacity style={styles.stopButton} onPress={handleStopSession}>
                  <MaterialCommunityIcons name="stop-circle-outline" size={18} color="#D32F2F" />
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={handleNextPress}>
                  <Text style={styles.nextButtonText}>
                    {currentPoseIndex < yogaPlan.length - 1 ? "Next Exercise" : "Finish Session"}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

      </ScrollView>

      {/* Ready Modal */}
      <Modal
        visible={showReadyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReadyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="yoga" size={64} color="#FF7F50" />
            <Text style={styles.modalTitle}>Are You Ready?</Text>
            <Text style={styles.modalText}>
              Make sure you understand the pose and have enough space to perform it safely.
              {'\n\n'}
              Live tracking will start immediately - no camera shutter sounds!
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={handleNotReady}
              >
                <Text style={styles.modalButtonSecondaryText}>Watch Again</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={handleLetsGetStarted}
              >
                <Text style={styles.modalButtonPrimaryText}>Let's Get Started!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
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
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  },
  videoLoading: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  noVideoContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noVideoText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  proceedButton: {
    backgroundColor: "#FF7F50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  proceedButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  readyButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  readyButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 16,
  },
  instructionCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    position: "relative",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    padding: 16,
    pointerEvents: "none",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  liveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  sessionActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  stopButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F5B5B5",
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    paddingVertical: 12,
  },
  stopButtonText: {
    marginLeft: 8,
    color: "#D32F2F",
    fontWeight: "700",
  },
  nextButton: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF7F50",
    borderRadius: 12,
    paddingVertical: 12,
  },
  nextButtonText: {
    color: "#fff",
    fontWeight: "700",
    marginRight: 8,
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
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  backButtonText: {
    color: "#FF7F50",
    fontWeight: "600",
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
  },
  modalButtonSecondaryText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: "#FF7F50",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  modalButtonPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

// Made with Bob
