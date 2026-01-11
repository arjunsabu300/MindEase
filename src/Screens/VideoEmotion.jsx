import React from "react";
import { View, Button, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

const API_URL_VIDEO = "http://10.184.19.43:5000/api/emotion/video";

export default function VideoEmotion({ navigation }) {

  const uploadVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    processVideo(asset.uri, asset.mimeType);
  };

  const recordVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    processVideo(asset.uri, asset.mimeType);
  };

  const processVideo = async (uri, mimeType) => {
  try {
    console.log("Video type:", mimeType);

    let form = new FormData();
    form.append("video", {
      uri,
      type: mimeType || "video/mp4",
      name: "video." + (mimeType?.split("/")[1] || "mp4"),
    });

    const response = await fetch(API_URL_VIDEO, {
      method: "POST",
      body: form,
      headers: {
        Accept: "application/json",
      },
    });

    const raw = await response.text();
    console.log("RAW RESPONSE:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      Alert.alert("Backend Error", raw.substring(0, 200));
      return;
    }

    // Handle the new response structure from multimodal
    navigation.navigate("EmotionInsight", {
      emotion: data.finalEmotion || data.emotion,
      confidence: data.confidence,
      voice: data.voice,
      text: data.text, // This is text_emotion from multimodal
      face: data.face,
      fusion: data.fusion || data,
      source: "video",
    });
  } catch (err) {
    Alert.alert("Error", err.message);
  }
};

  return (
    <View style={styles.container}>
      <Button title="Upload Video" onPress={uploadVideo} />
      <View style={{ height: 20 }} />
      <Button title="Record Video" onPress={recordVideo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
});
