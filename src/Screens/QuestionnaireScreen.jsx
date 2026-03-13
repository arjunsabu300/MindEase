import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

export default function QuestionnaireScreen({ route, navigation }) {

  const { questions, questionSessionId } = route.params;

  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  const selectOption = (questionId, optionId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const submitAnswers = async () => {

    setLoading(true);

    try {

      const response = await fetch(
        "http://192.168.1.5:5000/api/emotion/resolve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionSessionId,
            answers
          }),
        }
      );

      const data = await response.json();

      setLoading(false);

      navigation.replace("EmotionInsight", {
        emotion: data.emotion,
        confidence: data.confidence,
        source: "llm"
      });

    } catch (err) {
      setLoading(false);
      console.log(err);
    }
  };

  return (
    <View style={styles.container}>

      <ScrollView>

        {/* MESSAGE */}
        <Text style={styles.title}>
          Help us understand you better
        </Text>

        <Text style={styles.message}>
          Your facial expression, voice, and words suggest different emotions.
          This can happen naturally. Please answer a few quick questions so we
          can determine your emotional state more accurately.
        </Text>

        {/* QUESTIONS */}
        {questions.map((q) => (

          <View key={q.id} style={styles.questionContainer}>

            <Text style={styles.question}>
              {q.question}
            </Text>

            {q.options.map((opt) => {

              const selected =
                answers[q.id] === opt.id;

              return (

                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.option,
                    selected && styles.selectedOption
                  ]}
                  onPress={() =>
                    selectOption(q.id, opt.id)
                  }
                >
                  <Text style={styles.optionText}>
                    {opt.text}
                  </Text>

                </TouchableOpacity>

              );

            })}

          </View>

        ))}

        {/* SUBMIT BUTTON */}

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={submitAnswers}
        >
          {loading
            ? <ActivityIndicator color="#fff"/>
            : <Text style={styles.submitText}>
                Continue
              </Text>
          }
        </TouchableOpacity>

      </ScrollView>

    </View>
  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F8FAFC"
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10
  },

  message: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20
  },

  questionContainer: {
    marginBottom: 20
  },

  question: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10
  },

  option: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd"
  },

  selectedOption: {
    backgroundColor: "#4F46E5"
  },

  optionText: {
    color: "#000"
  },

  submitBtn: {
    backgroundColor: "#4F46E5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20
  },

  submitText: {
    color: "#fff",
    fontWeight: "600"
  }

});
