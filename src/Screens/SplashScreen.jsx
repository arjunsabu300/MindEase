import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // Start animations sequence
    Animated.sequence([
      // Background fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Logo appears with scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();

    // Navigate after animation
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width * 1.5, width * 1.5],
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.View style={[styles.gradient, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        >
          {/* Floating circles background */}
          <Animated.View
            style={[
              styles.circle,
              styles.circle1,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.08],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.circle,
              styles.circle2,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.12],
                }),
              },
            ]}
          />

          {/* Main content container */}
          <View style={styles.contentContainer}>
            {/* Logo with shimmer */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../assets/mindease-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                
                {/* Shimmer effect */}
                <Animated.View
                  style={[
                    styles.shimmer,
                    {
                      opacity: logoOpacity,
                      transform: [{ translateX: shimmerTranslate }],
                    },
                  ]}
                />
              </View>
            </Animated.View>

            {/* Tagline */}
            <Animated.View
              style={[
                styles.taglineContainer,
                {
                  opacity: taglineOpacity,
                },
              ]}
            >
              <View style={styles.divider} />
              <Text style={styles.tagline}>CALM MIND. BETTER YOU.</Text>
              <View style={styles.divider} />
            </Animated.View>

            {/* Loading dots */}
            <Animated.View
              style={[
                styles.loadingContainer,
                {
                  opacity: taglineOpacity,
                },
              ]}
            >
              <View style={styles.dotContainer}>
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: shimmerAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [0.3, 1, 0.3],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: shimmerAnim.interpolate({
                        inputRange: [-1, -0.3, 0.3, 1],
                        outputRange: [0.3, 1, 1, 0.3],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      opacity: shimmerAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [0.3, 0.3, 1],
                      }),
                    },
                  ]}
                />
              </View>
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  gradient: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: width * 1.8,
    height: width * 1.8,
    top: -width * 0.6,
    left: -width * 0.4,
  },
  circle2: {
    width: width * 1.4,
    height: width * 1.4,
    bottom: -width * 0.5,
    right: -width * 0.3,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  logoWrapper: {
    width: width * 0.65,
    height: width * 0.65,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ skewX: '-15deg' }],
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  divider: {
    width: 30,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 15,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});

export default SplashScreen;

// Made with Bob
