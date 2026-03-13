import React from "react";
import { View, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Text, TouchableOpacity } from 'react-native';
import { Upload, Camera } from 'lucide-react-native';

const API_URL_VIDEO = "http://192.168.1.3:5001/api/emotion/video";

export default function VideoEmotion({ navigation }) {

  const [loading, setLoading] = React.useState(false);


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
    setLoading(true);
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

    setLoading(false);
    // Handle the new response structure from multimodal
    // CHECK CONFLICT
    if (data.status === "conflict") {

      navigation.navigate("Questionnaire", {

      questions: data.fusion.questions,
      questionSessionId: data.fusion.questionSessionId,

      candidates: data.candidates, // optional
      face: data.face,
      voice: data.voice,
      text: data.text

      });

    } else {

      navigation.navigate("EmotionInsight", {

        emotion: data.finalEmotion,
        confidence: data.confidence,
        voice: data.voice,
        text: data.text,
        face: data.face,
        fusion: data.fusion,
        source: "video",

      });

    }

  } catch (err) {
    setLoading(false);
    Alert.alert("Error", err.message);
  }
};

  return (
    <View style={styles.container}>
      
      {loading && (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>
          Processing your video...
        </Text>
        <Text style={styles.loadingSubText}>
          Analyzing face, voice, and text emotion
        </Text>
      </View>
    )}

      <TouchableOpacity 
        style={[styles.button, styles.uploadButton]} 
        onPress={uploadVideo}
        activeOpacity={0.8}
      >
        <Upload color="#fff" size={24} />
        <Text style={styles.buttonText}>Upload Video</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.recordButton]} 
        onPress={recordVideo}
        activeOpacity={0.8}
      >
        <Camera color="#4F46E5" size={24} />
        <Text style={[styles.buttonText, styles.recordText]}>Record Video</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Soft light background
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    marginBottom: 16,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 3,
  },
  uploadButton: {
    backgroundColor: '#4F46E5', // Modern Indigo
  },
  recordButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: '#FFFFFF',
  },
  recordText: {
    color: '#4F46E5',
  },
  loadingOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255,255,255,0.9)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
},

loadingText: {
  marginTop: 16,
  fontSize: 18,
  fontWeight: "600",
  color: "#1E293B",
},

loadingSubText: {
  marginTop: 6,
  fontSize: 14,
  color: "#64748B",
},
});
