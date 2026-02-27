import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";

const MOCK_PLAN = [
  {
    id: "balasana",
    duration: 60,
    intensity: "low",
  },
];

export default function YogaSessionScreen({ route, navigation }) {
  const {
    yogaPlan = MOCK_PLAN,
  } = route?.params || {};

  const activePlan =
    yogaPlan && yogaPlan.length > 0 ? yogaPlan : MOCK_PLAN;

  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(
    activePlan[0]?.duration || 60
  );

  const [videoId, setVideoId] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [playing, setPlaying] = useState(true);

  const pose = activePlan[index];

  // ⏱ Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      if (index + 1 < activePlan.length) {
        setIndex(index + 1);
        setTimeLeft(activePlan[index + 1].duration);
      } else {
        navigation.goBack();
      }
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  // 🎥 Fetch YouTube video when pose changes
  useEffect(() => {
    fetchYoutubeVideo();
  }, [pose?.id]);

  const fetchYoutubeVideo = async () => {
    try {
      setLoadingVideo(true);

      const res = await fetch(
        `http://10.123.83.43:5000/api/yoga/youtube?pose=${pose.id}`
      );

      const data = await res.json();

      if (data.videoId) {
        setVideoId(data.videoId);
      } else {
        setVideoId(null);
      }
    } catch (err) {
      console.error("Error fetching YouTube video:", err);
      setVideoId(null);
    } finally {
      setLoadingVideo(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const onStateChange = useCallback((state) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Follow the Pose</Text>
        <MaterialCommunityIcons
          name="information-outline"
          size={24}
          color="#333"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Pose Info */}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name="playlist-play"
            size={20}
            color="#999"
          />
          <Text style={styles.metaText}>
            Pose {index + 1} of {activePlan.length} —{" "}
            {formatTime(timeLeft)}
          </Text>
        </View>

        {/* YouTube Player */}
        <View style={styles.videoContainer}>
          {loadingVideo ? (
            <ActivityIndicator size="large" color="#FF7F50" />
          ) : videoId ? (
            <YoutubePlayer
              height={250}
              play={playing}
              videoId={videoId}
              onChangeState={onStateChange}
            />
          ) : (
            <Text>No video found for {pose.id}</Text>
          )}
        </View>

        {/* Pose Details */}
        <View style={styles.infoCard}>
          <Text style={styles.poseTitle}>
            {pose.id.replace("_", " ").toUpperCase()}
          </Text>
          <Text style={styles.durationText}>
            Duration: {pose.duration} sec
          </Text>
          <Text style={styles.intensityText}>
            Intensity: {pose.intensity}
          </Text>
        </View>
      </ScrollView>

      {/* Controls */}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF8F3",
    paddingTop:
      Platform.OS === "android"
        ? StatusBar.currentHeight
        : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  metaText: {
    color: "#999",
    marginLeft: 6,
    fontSize: 14,
  },
  videoContainer: {
    marginVertical: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  poseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  durationText: {
    marginTop: 6,
    color: "#888",
  },
  intensityText: {
    marginTop: 4,
    color: "#888",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  nextBtn: {
    backgroundColor: "#FF7F50",
    borderRadius: 16,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});