import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Title,
  Surface,
  ActivityIndicator,
  RadioButton,
  HelperText,
  Chip,
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.169.146:5000/api';

const emotionalGoalsList = [
  'Stress Relief',
  'Anxiety Management',
  'Mood Improvement',
  'Better Sleep',
  'Increased Focus',
  'Emotional Balance',
];

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    health: '',
    emotionalGoals: [],
    yogaExperience: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleEmotionalGoal = (goal) => {
    setFormData(prev => ({
      ...prev,
      emotionalGoals: prev.emotionalGoals.includes(goal)
        ? prev.emotionalGoals.filter(g => g !== goal)
        : [...prev.emotionalGoals, goal],
    }));
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword, age, gender, health, yogaExperience } = formData;
    
    if (!name || !email || !password || !confirmPassword || !age || !gender || !yogaExperience) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (age < 10 || age > 100) {
      Alert.alert('Error', 'Age must be between 10 and 100');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age: parseInt(formData.age),
        gender: formData.gender,
        health: formData.health,
        emotionalGoals: formData.emotionalGoals,
        yogaExperience: formData.yogaExperience,
      });

      if (response.data.success) {
        // Store token and user data
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        
        Alert.alert('Success', 'Registration successful!');
        navigation.replace('Dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Surface style={styles.surface}>
          <Title style={styles.title}>Create Account</Title>
          <Text style={styles.subtitle}>Join MindEase for personalized wellness</Text>
          
          <TextInput
            label="Full Name *"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />
          
          <TextInput
            label="Email *"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
          />
          
          <TextInput
            label="Password *"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            mode="outlined"
            style={styles.input}
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          
          <TextInput
            label="Confirm Password *"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            mode="outlined"
            style={styles.input}
            secureTextEntry={!showConfirmPassword}
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />
          
          <TextInput
            label="Age *"
            value={formData.age}
            onChangeText={(value) => handleInputChange('age', value.replace(/[^0-9]/g, ''))}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Icon icon="calendar" />}
          />
          
          <Text style={styles.sectionTitle}>Gender *</Text>
          <RadioButton.Group
            onValueChange={(value) => handleInputChange('gender', value)}
            value={formData.gender}
          >
            <View style={styles.radioContainer}>
              <RadioButton.Item label="Male" value="male" />
              <RadioButton.Item label="Female" value="female" />
              <RadioButton.Item label="Other" value="other" />
            </View>
          </RadioButton.Group>
          
          <Text style={styles.sectionTitle}>Health Conditions</Text>
          <TextInput
            label="Please specify (optional)"
            value={formData.health}
            onChangeText={(value) => handleInputChange('health', value)}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
            left={<TextInput.Icon icon="heart-pulse" />}
          />


          <Text style={styles.sectionTitle}>Yoga Experience Level *</Text>
          <RadioButton.Group
            onValueChange={(value) => handleInputChange('yogaExperience', value)}
            value={formData.yogaExperience}
          >
            <View style={styles.radioContainer}>
              <RadioButton.Item label="Beginner" value="beginner" />
              <RadioButton.Item label="Intermediate" value="intermediate" />
              <RadioButton.Item label="Advanced" value="advanced" />
            </View>
          </RadioButton.Group>
          
          <Text style={styles.sectionTitle}>Emotional Goals (Optional)</Text>
          <View style={styles.chipsContainer}>
            {emotionalGoalsList.map((goal) => (
              <Chip
                key={goal}
                selected={formData.emotionalGoals.includes(goal)}
                onPress={() => toggleEmotionalGoal(goal)}
                style={styles.chip}
                mode="outlined"
              >
                {goal}
              </Chip>
            ))}
          </View>
          <HelperText type="info">
            Select what you'd like to improve
          </HelperText>
          
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
          
          <View style={styles.loginContainer}>
            <Text>Already have an account? </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              compact
            >
              Login
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  surface: {
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#6200ee',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
    color: '#333',
  },
  radioContainer: {
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    margin: 4,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});

export default RegisterScreen;