import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Image, SafeAreaView, Platform, StatusBar } from "react-native";
import { Text, Card, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";


const API_URL_YOGA = "http://10.184.19.43:5000/api/yoga/recommend";

// Default fallback data
const DEFAULT_PARAMS = {
  emotion: "Stressed",
  confidence: 0.85,
  voice: { emotion: "Neutral", confidence: 0.79 },
  text: { emotion: "Sad", confidence: 0.72 },
  fusion: true
};

export default function EmotionInsightScreen({ route, navigation }) {
  // Safe destructuring
  const { emotion, confidence, voice, text } = route?.params || DEFAULT_PARAMS;
  console.log(voice, text);
  
  const [yogaPlan, setYogaPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState(null);


  // Calculate stats dynamically from the API data
  const totalDurationSec = yogaPlan.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalDurationMin = Math.ceil(totalDurationSec / 60);
  const poseCount = yogaPlan.length;

  useEffect(() => {
    loadUser();
    fetchYogaPlan();
  }, []);
  const loadUser = async () => {
    const data = await AsyncStorage.getItem("userData");
    if (data) {
      const user = JSON.parse(data);
      setUserId(user.id); // ✅ THIS IS THE FIX
    }
  };
  const fetchYogaPlan = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem("userData"));
      console.log("Fetching yoga plan for:", emotion);
      
      const yogaRes = await fetch(API_URL_YOGA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: userData.id, 
            emotion, 
            userProfile: { avg_completion: 0.7 } 
        }),
      });

      const yogaData = await yogaRes.json();
      
      // Ensure we are setting the array from the response
      if (yogaData) {
        setYogaPlan(yogaData.yogaPlan || []);
        setSessionId(yogaData.sessionId); // ✅ store sessionId
      }
      
      setLoading(false);

    } catch (err) {
      console.error("Error fetching yoga plan:", err);
      setLoading(false);
      // Optional: Set a fallback plan here if API fails
    }
  };

const ModalityChip = ({ icon, label, percent, active }) => {
  // Convert to percentage with 2 decimal places
  const formattedPercent = (percent * 100).toFixed(2);

  return (
    <View style={[styles.modalityChip, active && styles.modalityChipActive]}>
      <MaterialCommunityIcons 
        name={icon} 
        size={18} 
        color={active ? "#fff" : "#555"} 
      />
      <Text style={[styles.modalityText, active && styles.modalityTextActive]}>
        {label}..{formattedPercent}%
      </Text>
    </View>
  );
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Your Emotional Insight</Text>
          <MaterialCommunityIcons name="information-outline" size={24} color="#333" />
        </View>

        <Text style={styles.subHeaderDesc}>
          Multimodal analysis combines face, voice, and text to estimate your dominant emotion.
        </Text>

        {/* Emotion Card */}
        <Card style={styles.emotionCard}>
          <View style={styles.emotionHeader}>
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>
                {emotion === "Stressed" ? "😰" : emotion === "Happy" ? "😊" : "😐"}
              </Text>
            </View>
            <View style={styles.emotionTextContainer}>
              <Text style={styles.mainEmotionText}>You seem {emotion}</Text>
              <Text style={styles.subText}>
                Dominant emotion: {emotion} • Confidence {Math.round(confidence * 100)}%
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <MaterialCommunityIcons name="pulse" size={14} color="#5C4033" />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${confidence * 100}%` }]} />
            <View style={styles.progressBarBackground} />
          </View>

          {/* Modalities Row */}
          <View style={styles.modalitiesRow}>
            <ModalityChip icon="camera-outline" label="F" percent={88} />
            <ModalityChip icon="microphone-outline" label="V" percent={voice.confidence} />
            <ModalityChip icon="format-text" label="T" percent={text.confidence} active={true} />
          </View>
        </Card>

        {/* Suggested Routine Section */}
        <Text style={styles.sectionTitle}>Suggested Routine</Text>

        <Card style={styles.routineCard}>
          <View style={styles.routineContentRow}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' }} 
              style={styles.routineImage} 
            />
            <View style={styles.routineInfo}>
              <Text style={styles.routineTitle}>
                 {loading ? "Loading Plan..." : "Personalized Flow"}
              </Text>
              
              {/* DYNAMIC DATA DISPLAY */}
              <Text style={styles.routineMeta}>
                {loading ? "..." : `${totalDurationMin} mins • ${poseCount} Poses • Beginner`}
              </Text>
              
              <Text style={styles.routineDesc}>
                Relieves stress, improves breathing, calms the nervous system
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              style={styles.startBtn}
              labelStyle={styles.startBtnLabel}
              disabled={loading || yogaPlan.length === 0}
              onPress={() =>
                navigation.navigate("YogaSession", {
                  yogaPlan,
                  emotion,
                  sessionId,
                  userId,
                })
              }

            >
              Start Yoga Session
            </Button>
            
            <Button 
            mode="outlined" 
            style={styles.moreBtn}
            labelStyle={styles.moreBtnLabel}
            // Prevent clicking if data isn't loaded yet
            disabled={loading || !yogaPlan || yogaPlan.length === 0}
            onPress={() => navigation.navigate("YogaList", { yogaPlan })}
            >
            View Exercises
            </Button>
          </View>
        </Card>

      </ScrollView>

      {/* Bottom Navigation Placeholder */}
      <View style={styles.bottomNav}>
        <View style={styles.navItem}>
            <MaterialCommunityIcons name="pulse" size={24} color="#333" />
            <Text style={[styles.navText, styles.navActive]}>Analyze</Text>
        </View>
        <View style={styles.navItem}>
            <MaterialCommunityIcons name="history" size={24} color="#999" />
            <Text style={styles.navText}>History</Text>
        </View>
        <View style={styles.navItem}>
            <MaterialCommunityIcons name="account-outline" size={24} color="#999" />
            <Text style={styles.navText}>Profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF5EC",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  subHeaderDesc: {
    color: "#888",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 20,
  },
  emotionCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  emotionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  emotionTextContainer: {
    flex: 1,
  },
  mainEmotionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subText: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD54F",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5C4033",
    marginLeft: 4,
  },
  progressContainer: {
    height: 6,
    marginTop: 16,
    marginBottom: 16,
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: "#FFE0D6",
    borderRadius: 3,
  },
  progressBar: {
    height: '100%',
    backgroundColor: "#FF7F50",
    borderRadius: 3,
    zIndex: 1,
  },
  modalitiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalityChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    width: "30%",
    justifyContent: "center",
  },
  modalityChipActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  modalityText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  modalityTextActive: {
    color: "#fff",
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  routineCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFF0EB",
    elevation: 0,
  },
  routineContentRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  routineImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#ddd",
  },
  routineInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  routineMeta: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  routineDesc: {
    fontSize: 12,
    color: "#555",
    marginTop: 6,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  startBtn: {
    flex: 0.48,
    backgroundColor: "#FF7F50",
    borderRadius: 14,
  },
  startBtnLabel: {
    fontSize: 12,
    color: "white",
    fontWeight: "700",
    marginVertical: 10,
  },
  moreBtn: {
    flex: 0.48,
    borderColor: "#fff",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
  },
  moreBtnLabel: {
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
    marginVertical: 10,
  },
  bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingVertical: 16,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  navItem: {
      alignItems: 'center',
  },
  navText: {
      fontSize: 10,
      marginTop: 4,
      color: "#999"
  },
  navActive: {
      color: "#1A1A1A",
      fontWeight: "600"
  }
});