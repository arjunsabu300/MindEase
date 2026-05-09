import React, { useEffect, useState } from "react";
import { View, Alert } from "react-native";
import { Text, Button, Title } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL_FEEDBACK = "https://mindease-euf7.onrender.com/api/feedback";

export default function FeedbackScreen({ route, navigation }) {
  const { sessionId, userId: routeUserId, completed = true, completionRatio = 1 } = route.params || {};
  console.log("FeedbackScreen params:", route.params);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(routeUserId || null);

  useEffect(() => {
    const loadUserId = async () => {
      if (routeUserId) {
        return;
      }

      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (!storedUserData) {
          return;
        }

        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData?.id) {
          setUserId(parsedUserData.id);
        }
      } catch (error) {
        console.error("Failed to load user data for feedback:", error.message);
      }
    };

    loadUserId();
  }, [routeUserId]);

  const submitFeedback = async () => {
    try {
      if (!sessionId || !userId) {
        Alert.alert("Error", "Session or user information is missing");
        return;
      }

      setLoading(true);

      const res = await fetch(API_URL_FEEDBACK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId,
          completed,
          completionRatio,
          rating,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      Alert.alert("Thank you!", "Your feedback was recorded");
      navigation.replace("Dashboard");
    } catch (err) {
      console.error("Feedback error:", err.message);
      Alert.alert("Error", "Could not submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Title>How was your session?</Title>

      <View style={{ flexDirection: "row", marginVertical: 20 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            mode={rating === n ? "contained" : "outlined"}
            onPress={() => setRating(n)}
          >
            ⭐
          </Button>
        ))}
      </View>

      <Button
        mode="contained"
        loading={loading}
        onPress={submitFeedback}
      >
        Submit Feedback
      </Button>
    </View>
  );
}
