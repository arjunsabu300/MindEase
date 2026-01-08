import React, { useState } from "react";
import { View } from "react-native";
import { Text, Button, Title } from "react-native-paper";

export default function FeedbackScreen({ navigation }) {
  const [rating, setRating] = useState(0);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Title>How was your session?</Title>

      <View style={{ flexDirection: "row", marginVertical: 20 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Button key={n} onPress={() => setRating(n)}>
            ⭐
          </Button>
        ))}
      </View>

      <Button
        mode="contained"
        onPress={() => navigation.navigate("EmotionInsight")}
      >
        Submit Feedback
      </Button>
    </View>
  );
}
