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

// const API_URL = "https://192.168.3.55:8081/api/emotion/voice";

const DashboardScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [currentMood, setCurrentMood] = useState("calm");
  const [loadingSER, setLoadingSER] = useState(false);
  const [loadingFER, setLoadingFER] = useState(false);


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

// const API_URL_SER = "http://192.168.3.55:5001/api/emotion/voice";

// const API_URL_STT = "http://192.168.3.55:5001/api/emotion/voicetext";

const API_URL_MULTI = "https://mindease-px7s.onrender.com/api/emotion/multimodal";

const startVoiceAnalysis = async () => {
  try {
    setLoadingSER(true);

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Microphone access needed");
      setLoadingSER(false);
      return;
    }

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
    );
    await recording.startAsync();

    Alert.alert("Recording", "Please speak for 5 seconds");

    setTimeout(async () => {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "voice.wav",
        type: "audio/wav",
      });

      const response1 = await fetch(API_URL_MULTI, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      // const response2 = await fetch(API_URL_STT, {
      //   method: "POST",
      //   body: formData,
      //   headers: { "Content-Type": "multipart/form-data" },
      // });

      const result = await response1.json();
      console.log("Multimodal Result:", result);
      console.log("Final Emotion:", result.final.final_emotion);
      setCurrentMood(result.final.final_emotion);
      setLoadingSER(false);

      navigation.navigate("EmotionInsight", {
        emotion: result.final.final_emotion,
        confidence: result.final.confidence,
        voice: result.voice,
        text: result.text_emotion,
        fusion: result.final,
    });
    }, 5001);
  } catch (err) {
    setLoadingSER(false);
    Alert.alert("Error", err.message);
  }
};


  /* ===================== FER ===================== */

const API_URL_FACE = "https://mindease-px7s.onrender.com/api/emotion/face";


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

    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      name: "face.jpg",
      type: "image/jpeg",
    });

    const response = await fetch(API_URL_FACE, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    setLoadingFER(false);

    if (!response.ok) {
      Alert.alert("Face Error", data.error || "Unknown error");
      return;
    }

    navigation.navigate("EmotionInsight", {
      emotion: data.label,                  // 🌟 REAL AI OUTPUT
      confidence: data.score ?? 0.9,        // safe fallback
      voice: { emotion: "neutral", confidence: 0.5 }, // static
      text: { emotion: "neutral", confidence: 0.5 },  // static
      source: "face",
    });

  } catch (err) {
    setLoadingFER(false);
    console.error("Analysis Error:", err);
    Alert.alert("Error", err.message);
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

  // Old DB with separte for voice,face,text
  // const quickActions = [
  //   {
  //     title: "Detect Emotion",
  //     icon: "video",
  //     description: "Analyze both face and voice from video",
  //     color: "#673AB7",
  //     comingSoon: false,
  //     onPress: () => navigation.navigate("VideoEmotion"),
  //   },
  //   {
  //     title: "Face Analysis",
  //     icon: "face-recognition",
  //     description: "Detect emotions from facial expressions",
  //     color: "#4CAF50",
  //     comingSoon: false,
  //     onPress: startFaceAnalysis,
  //   },


  //   {
  //     title: "Voice Analysis",
  //     icon: "microphone",
  //     description: "Analyze emotions from your voice",
  //     color: "#2196F3",
  //     comingSoon: false,
  //     onPress: startVoiceAnalysis,
  //   },
  //   {
  //     title: "Text Analysis",
  //     icon: "text-box",
  //     description: "Understand emotions from text",
  //     color: "#FF9800",
  //     comingSoon: true,
  //   },
  //   {
  //     title: "EQ Test",
  //     icon: "clipboard-text",
  //     description: "Assess emotional intelligence",
  //     color: "#9C27B0",
  //     comingSoon: true,
  //   },
  // ];
  const quickActions = [
  {
    title: "Detect Emotion",
    icon: "video",
    description: "Upload a video to analyze face, voice, and text emotion",
    color: "#673AB7",
    comingSoon: false,
    onPress: () => navigation.navigate("VideoEmotion"),
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

          <View style={styles.headerIcons}>
            <IconButton
              icon="account"
              iconColor="white"
              size={24}
              onPress={() => navigation.navigate('Profile')}
            />
            <IconButton
              icon="history"
              iconColor="white"
              size={24}
              onPress={() => navigation.navigate('History')}
            />
            <IconButton
              icon="logout"
              iconColor="white"
              size={24}
              onPress={handleLogout}
            />
          </View>
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
                  style={styles.actionCard}
                  onPress={a.onPress}
                >
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientCard}
                  >
                  <Card.Content style={styles.actionContent}>

                    <IconButton
                      icon={a.icon}
                      iconColor="white"
                      size={48}
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
                  </LinearGradient>
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

  headerIcons: {
    flexDirection: "row",
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

  sectionTitle: {
  marginBottom: 18,
  fontWeight: "700",
  textAlign: "center",
  fontSize: 20,
},


  actionsGrid: {
  justifyContent: "center",
  alignItems: "center",
},



  actionCard: {
  width: width * 0.85,
  borderRadius: 22,
  elevation: 8,
  backgroundColor: "transparent",
  
},



  actionContent: { alignItems: "center" },

  actionTitle: {
  fontWeight: "700",
  marginTop: 8,
  fontSize: 20,
  textAlign: "center",
  color: "white",
},


  actionDesc: {
  fontSize: 14,
  color: "rgba(255,255,255,0.9)",
  textAlign: "center",
  marginTop: 6,
},

  gradientCard: {
  borderRadius: 22,
  paddingVertical: 30,
  alignItems: "center",

  shadowColor: "#764ba2",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
},


  soonChip: {
    marginTop: 6,
    backgroundColor: "#eee",
  },
});
