import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, SafeAreaView, ScrollView, Platform, StatusBar } from "react-native";
import { Text, Button } from "react-native-paper";
import { Video } from "expo-av";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Assuming v1 is a local file.
// If v1 is a local import, usage is source={v1}
// If v1 is a URL string, usage is source={{ uri: v1 }}
// import v1 from "../Components/IMG_1574.MOV"; 

const v1 = "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-meditation-in-the-living-room-40562-large.mp4";

const { width } = Dimensions.get("window");

// Mock Data incase params are missing
const MOCK_PLAN = [
    { duration: 45, name: "Wheel Pose", steps: [
        "Root your feet hip-width apart. Lengthen the spine and relax the jaw.",
        "On inhale, raise arms overhead, palms facing each other, shoulders down.",
        "Exhale and soften the ribs. Keep a gentle micro-bend in the knees."
    ]}
];

export default function YogaSessionScreen({ route, navigation }) {
  const {
    yogaPlan = MOCK_PLAN,
    sessionId,
    userId,
    emotion,
  } = route?.params || {};

//   console.log("YogaSessionScreen params:", route?.params);
  
  // Guard clause if yogaPlan is empty
  const activePlan = yogaPlan && yogaPlan.length > 0 ? yogaPlan : MOCK_PLAN;
  
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(
  activePlan.length > 0 ? activePlan[0].duration : 60
);


  const pose = activePlan[index];

  useEffect(() => {
    if (timeLeft <= 0) {
      if (index + 1 < activePlan.length) {
        setIndex(index + 1);
        setTimeLeft(activePlan[index + 1].duration);
      } else {
        // Navigate away or finish
        if(navigation) navigation.goBack(); 
      }
    }

    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Follow the Pose</Text>
        <MaterialCommunityIcons name="information-outline" size={24} color="#333" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Progress & Time */}
        <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
                <MaterialCommunityIcons name="playlist-play" size={20} color="#999" />
                <Text style={styles.metaText}>Pose {index + 1} of {activePlan.length} — {formatTime(timeLeft)}</Text>
            </View>
            <View style={styles.adaptiveBadge}>
                <MaterialCommunityIcons name="speedometer" size={12} color="#333" />
                <Text style={styles.adaptiveText}>Adaptive</Text>
            </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${((index + 1) / activePlan.length) * 100}%` }]} />
            <View style={styles.progressBarBg} />
        </View>

        {/* Video/Image Container */}
        <View style={styles.videoContainer}>
            <Video
                source={{ uri: v1 }} // Fixed Syntax
                resizeMode="cover"
                shouldPlay
                isLooping
                isMuted
                style={styles.video}
            />
            {/* Overlay Gradient could go here */}
        </View>

        {/* Breathing Card */}
        <View style={styles.breathCard}>
            <View style={styles.breathLeft}>
                <View style={styles.breathIconContainer}>
                    <View style={styles.breathInnerCircle} />
                </View>
                <View>
                    <Text style={styles.breathTitle}>Inhale • 4s</Text>
                    <Text style={styles.breathSub}>Expand chest, soften shoulders</Text>
                </View>
            </View>
            <View style={styles.paceBadge}>
                <MaterialCommunityIcons name="pulse" size={16} color="#333" />
                <Text style={styles.paceText}>Calm Pace</Text>
            </View>
        </View>

        {/* Step by Step Card */}
        <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Step-by-step</Text>
            
            {/* Steps List */}
            {pose.steps ? pose.steps.map((step, i) => (
                 <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNumberContainer}>
                        <Text style={styles.stepNumber}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                 </View>
            )) : (
                // Fallback if no steps provided in data
                <>
                    <View style={styles.stepRow}>
                        <View style={styles.stepNumberContainer}><Text style={styles.stepNumber}>1</Text></View>
                        <Text style={styles.stepText}>Root your feet hip-width apart. Lengthen the spine and relax the jaw.</Text>
                    </View>
                    <View style={styles.stepRow}>
                        <View style={styles.stepNumberContainer}><Text style={styles.stepNumber}>2</Text></View>
                        <Text style={styles.stepText}>On inhale, raise arms overhead, palms facing each other, shoulders down.</Text>
                    </View>
                </>
            )}

            <Text style={styles.tipText}>Tip: If balance wavers, widen your stance slightly.</Text>
        </View>

      </ScrollView>

      {/* Bottom Controls */}
      <View style={styles.footer}>
        <Button 
            mode="contained" 
            style={styles.nextBtn} 
            contentStyle={{ height: 50 }}
            labelStyle={styles.btnLabel}
            onPress={() => setTimeLeft(0)}
        >
          Next Pose
        </Button>
        <Button 
            mode="outlined" 
            style={styles.pauseBtn}
            contentStyle={{ height: 50 }}
            labelStyle={styles.pauseBtnLabel}
            onPress={() =>
            navigation.replace("Feedback", {
                sessionId,
                userId,
                completed: false,
                completionRatio: index / activePlan.length,
            })
            }



        >
          Pause Session
        </Button>
      </View>
       
       {/* Bottom Nav Placeholder */}
       <View style={styles.bottomNav}>
            <View style={styles.navItem}>
                <MaterialCommunityIcons name="pulse" size={24} color="#999" />
                <Text style={styles.navText}>Analyze</Text>
            </View>
            <View style={styles.navItem}>
                <MaterialCommunityIcons name="play-circle-outline" size={24} color="#1A1A1A" />
                <Text style={[styles.navText, styles.navActive]}>Session</Text>
            </View>
            <View style={styles.navItem}>
                <MaterialCommunityIcons name="history" size={24} color="#999" />
                <Text style={styles.navText}>History</Text>
            </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF8F3",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: "#FFF8F3",
  },
  headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#1A1A1A"
  },
  scrollContainer: {
      paddingHorizontal: 20,
      paddingBottom: 120, // Space for footer + nav
  },
  metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
  },
  metaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  metaText: {
      color: "#999",
      marginLeft: 6,
      fontSize: 14,
  },
  adaptiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: "#fff",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#EEE"
  },
  adaptiveText: {
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 4,
      color: "#333"
  },
  progressContainer: {
      height: 6,
      width: '100%',
      marginTop: 12,
      marginBottom: 20,
      position: 'relative'
  },
  progressBarBg: {
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
  videoContainer: {
      width: '100%',
      height: 240,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: '#EAB',
      marginBottom: 20,
  },
  video: {
      width: '100%',
      height: '100%',
  },
  breathCard: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "#F5F5F5",
      shadowColor: "#000",
      shadowOpacity: 0.02,
      shadowRadius: 5,
      elevation: 2,
  },
  breathLeft: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  breathIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#FFF0EB",
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
  },
  breathInnerCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: "#FF7F50",
  },
  breathTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1A1A1A"
  },
  breathSub: {
      fontSize: 12,
      color: "#999",
  },
  paceBadge: {
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#eee",
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
  },
  paceText: {
      fontSize: 10,
      fontWeight: "600",
      color: "#333",
      textAlign: 'center'
  },
  stepsCard: {
      backgroundColor: "#fff",
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: "#F5F5F5",
  },
  stepsTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#1A1A1A",
      marginBottom: 16,
  },
  stepRow: {
      flexDirection: 'row',
      marginBottom: 16,
      alignItems: 'flex-start'
  },
  stepNumberContainer: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: "#FFF0EB",
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
      marginRight: 12,
  },
  stepNumber: {
      fontSize: 12,
      fontWeight: "700",
      color: "#FF7F50"
  },
  stepText: {
      flex: 1,
      fontSize: 14,
      color: "#444",
      lineHeight: 20,
  },
  tipText: {
      fontSize: 12,
      color: "#BBB",
      marginTop: 8,
  },
  footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 20,
      marginBottom: 60, // Space for bottom nav
  },
  nextBtn: {
      flex: 0.48,
      backgroundColor: "#FF7F50",
      borderRadius: 16,
  },
  pauseBtn: {
      flex: 0.48,
      backgroundColor: "#fff",
      borderColor: "#eee",
      borderWidth: 1,
      borderRadius: 16,
  },
  btnLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "#fff"
  },
  pauseBtnLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "#333"
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