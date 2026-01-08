import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { Provider as PaperProvider } from "react-native-paper";

// Screens
import LoginScreen from "./src/Screens/LoginScreen";
import RegisterScreen from "./src/Screens/RegisterScreen";
import DashboardScreen from "./src/Screens/Dashboard";
import EmotionInsightScreen from "./src/Screens/EmotionInsightscreen";
import YogaSessionScreen from "./src/Screens/YogaSessionScreen";
import FeedbackScreen from "./src/Screens/Feedbackscreen";
import YogaListScreen from "./src/Screens/Yogalistscreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: "#FFF5EC",
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: "#333",
            headerTitleStyle: {
              fontWeight: "700",
            },
          }}
        >
          {/* AUTH */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: "Create Account" }}
          />

          {/* MAIN */}
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              title: "MindEase",
              headerLeft: () => null, // disable back
            }}
          />

          <Stack.Screen
            name="EmotionInsight"
            component={EmotionInsightScreen}
            options={{
              title: "Your Emotional Insight",
            }}
          />

          {/* FULL SCREEN EXPERIENCE */}
          <Stack.Screen
            name="YogaSession"
            component={YogaSessionScreen}
            options={{
              headerShown: false,
              gestureEnabled: false, // prevent swipe-back
            }}
          />

          <Stack.Screen
            name="Feedback"
            component={FeedbackScreen}
            options={{
              title: "Session Feedback",
              headerLeft: () => null,
            }}
          />

          <Stack.Screen 
          name="YogaList" 
          component={YogaListScreen} 
          options={{ headerShown: false }} 
        />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
