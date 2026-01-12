import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import {
  Title,
  Text,
  Avatar,
  Card,
  IconButton,
  Chip,
  ActivityIndicator,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";

const { width } = Dimensions.get("window");

// const API_URL = "https://192.168.1.2:8081/api/emotion/voice";

const DashboardScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [currentMood, setCurrentMood] = useState("calm");
  const [loadingSER, setLoadingSER] = useState(false);
  const [loadingFER, setLoadingFER] = useState(false);
  const [faceImage, setFaceImage] = useState(null);
  const [faceResult, setFaceResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = React.useRef(null);




  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem("userData");
      if (data) setUserData(JSON.parse(data));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          navigation.replace("Login");
        },
      },
    ]);
  };

  /* ===================== SER ===================== */

// const API_URL_SER = "http://192.168.1.5:5000/api/emotion/voice";

// const API_URL_STT = "http://192.168.1.5:5000/api/emotion/voicetext";

const API_URL_MULTI = "http://192.168.1.5:5000/api/emotion/multimodal";


const cleanupRecording = async () => {
  try {
    if (recordingRef.current) {
      const status = await recordingRef.current.getStatusAsync();
      if (status?.isRecording) {
        await recordingRef.current.stopAndUnloadAsync();
      }
    }
  } catch (e) {
    console.warn("Recording cleanup skipped:", e.message);
  } finally {
    recordingRef.current = null;
  }
};



const startVoiceAnalysis = async () => {
  if (!faceImage) {
    Alert.alert("Face Required", "Please upload your face image first");
    return;
  }

  if (isRecording) return;

  try {
    setIsRecording(true);
    setLoadingSER(true);

    /* 🧹 HARD CLEANUP FIRST */
    await cleanupRecording();

    /* 🔊 AUDIO MODE */
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error("Microphone permission denied");

    /* 🎙️ CREATE SINGLE RECORDING */
    const recording = new Audio.Recording();
    recordingRef.current = recording;

    await recording.prepareToRecordAsync({
      android: {
        extension: ".wav",
        outputFormat:
          Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
        audioEncoder:
          Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
      },
      ios: {
        extension: ".wav",
        audioQuality:
          Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    });

    await recording.startAsync();
    console.log("🎙️ Recording started");

    setTimeout(async () => {
      try {
        await recording.stopAndUnloadAsync();
        recordingRef.current = null;

        const audioUri = recording.getURI();
        if (!audioUri) throw new Error("Audio recording failed");

        const formData = new FormData();
        formData.append("audio", {
          uri: audioUri,
          name: "voice.wav",
          type: "audio/wav",
        });
        formData.append("image", {
          uri: faceImage,
          name: "face.jpg",
          type: "image/jpeg",
        });

        const response = await fetch(API_URL_MULTI, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (!response.ok || !result?.final) {
          throw new Error("Fusion failed");
        }

        setCurrentMood(result.final.final_emotion);

        navigation.navigate("EmotionInsight", {
          emotion: result.final.final_emotion,
          confidence: result.final.confidence,
          voice: result.voice,
          text: result.text_emotion,
          face: result.face_emotion,
          fusion: result.final,
          source: "fusion",
        });

      } catch (err) {
        Alert.alert("Analysis Error", err.message);
      } finally {
        setLoadingSER(false);
        setIsRecording(false);
      }
    }, 5000);

  } catch (err) {
    console.error("🎤 Voice error:", err.message);
    await cleanupRecording();
    setLoadingSER(false);
    setIsRecording(false);
    Alert.alert("Voice Error", err.message);
  }
};






  /* ===================== FER ===================== */

const API_URL_FACE = "http://192.168.1.5:5000/api/emotion/face";


/* ===================== FACE ANALYSIS (FER) ===================== */
const startFaceAnalysis = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery access required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setLoadingFER(true);
    const imageUri = result.assets[0].uri;

    // ✅ STORE IMAGE ONLY
    setFaceImage(imageUri);

    setLoadingFER(false);
    Alert.alert("Face Captured", "Now tap Voice Analysis and speak");

  } catch (err) {
    setLoadingFER(false);
    Alert.alert("Face Error", err.message);
  }
};





  /* ===================== UI ===================== */

  const emotionIcons = {
    happy: "emoticon-happy",
    sad: "emoticon-sad",
    calm: "emoticon-cool",
    angry: "emoticon-angry",
    fearful: "emoticon-frown",
    neutral: "emoticon-neutral",
  };

  const quickActions = [
    {
      title: "Face Analysis",
      icon: "face-recognition",
      description: "Detect emotions from facial expressions",
      color: "#4CAF50",
      comingSoon: false,
      onPress: startFaceAnalysis,
    },


    {
      title: "Voice Analysis",
      icon: "microphone",
      description: "Analyze emotions from your voice",
      color: "#2196F3",
      comingSoon: false,
      onPress: startVoiceAnalysis,
    },
    {
      title: "Text Analysis",
      icon: "text-box",
      description: "Understand emotions from text",
      color: "#FF9800",
      comingSoon: true,
    },
    {
      title: "EQ Test",
      icon: "clipboard-text",
      description: "Assess emotional intelligence",
      color: "#9C27B0",
      comingSoon: true,
    },
  ];

  if (!userData) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.loading}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.userRow}>
            <Avatar.Text
              size={64}
              label={userData.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
              style={styles.avatar}
            />
            <View>
              <Title style={styles.userName}>
                Hi, {userData.name.split(" ")[0]} 👋
              </Title>
              <Chip
                icon={emotionIcons[currentMood]}
                style={styles.moodChip}
                textStyle={{ color: "white" }}
              >
                Feeling {currentMood}
              </Chip>
            </View>
          </View>

          <IconButton
            icon="logout"
            iconColor="white"
            onPress={handleLogout}
          />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* WELCOME */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>🌿 MindEase</Title>
            <Text style={styles.subtitle}>
              Your AI-powered emotional wellness companion
            </Text>
          </Card.Content>
        </Card>

        {/* ACTIONS */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Wellness Tools</Title>

            <View style={styles.actionsGrid}>
              {quickActions.map((a, i) => (
                <Card
                  key={i}
                  style={[styles.actionCard, { borderLeftColor: a.color }]}
                  onPress={
                    a.comingSoon
                      ? () =>
                          Alert.alert(
                            "Coming Soon",
                            `${a.title} will be available soon`
                          )
                      : a.onPress
                  }
                >
                  <Card.Content style={styles.actionContent}>
                    <IconButton
                      icon={a.icon}
                      iconColor={a.color}
                      size={28}
                    />
                    <Text style={styles.actionTitle}>{a.title}</Text>
                    <Text style={styles.actionDesc}>{a.description}</Text>

                    {a.comingSoon && (
                      <Chip compact style={styles.soonChip}>
                        Soon
                      </Chip>
                    )}

                    {!a.comingSoon && loadingSER && a.title === "Voice Analysis" && (
                      <ActivityIndicator size="small" />
                    )}
                    {/* Loading indicator for Face Analysis */}
                    {!a.comingSoon && loadingFER && a.title === "Face Analysis" && (
                      <ActivityIndicator size="small" />
                    )}

                  </Card.Content>
                </Card>
              ))}
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7fb" },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: { color: "white", marginTop: 12 },

  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  userRow: { flexDirection: "row", alignItems: "center" },

  avatar: { backgroundColor: "white", marginRight: 12 },

  userName: { color: "white", fontWeight: "700" },

  moodChip: {
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  content: { padding: 16 },

  card: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 4,
  },

  subtitle: { color: "#666", marginTop: 4 },

  sectionTitle: { marginBottom: 12, fontWeight: "700" },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  actionCard: {
    width: (width - 48) / 2,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },

  actionContent: { alignItems: "center" },

  actionTitle: { fontWeight: "700", marginTop: 4 },

  actionDesc: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginVertical: 6,
  },

  soonChip: {
    marginTop: 6,
    backgroundColor: "#eee",
  },
});
