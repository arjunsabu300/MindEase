import React, { useState } from "react";
import { View, Alert } from "react-native";
import { Text, Button, Title } from "react-native-paper";

const API_URL_FEEDBACK = "http://10.184.19.43:5000/api/feedback";

export default function FeedbackScreen({ route, navigation }) {
  const { sessionId, userId, completed, completionRatio } = route.params;
  console.log("FeedbackScreen params:", route.params);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const submitFeedback = async () => {
    try {
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
