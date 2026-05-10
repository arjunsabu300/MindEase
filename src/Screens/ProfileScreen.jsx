import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Title,
  Text,
  TextInput,
  Button,
  Card,
  Avatar,
  Chip,
  ActivityIndicator,
  IconButton,
  Divider,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = 'https://mindease-px7s.onrender.com/api';

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Profile data
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    age: '',
    gender: '',
    health: '',
    emotionalGoals: [],
    yogaExperience: '',
  });

  // Stats data
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    avgCompletion: 0,
    totalPosesCompleted: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
        return;
      }

      // Fetch profile
      const profileResponse = await fetch(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const profileData = await profileResponse.json();

      if (profileData.success) {
        setProfile({
          name: profileData.user.name || '',
          email: profileData.user.email || '',
          age: profileData.user.age?.toString() || '',
          gender: profileData.user.gender || '',
          health: profileData.user.health || '',
          emotionalGoals: profileData.user.emotionalGoals || [],
          yogaExperience: profileData.user.yogaExperience || '',
        });
      }

      // Fetch stats
      const statsResponse = await fetch(`${API_URL}/profile/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('Profile load error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.name,
          age: parseInt(profile.age),
          gender: profile.gender,
          health: profile.health,
          emotionalGoals: profile.emotionalGoals,
          yogaExperience: profile.yogaExperience,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local storage
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          user.name = profile.name;
          user.age = parseInt(profile.age);
          user.gender = profile.gender;
          user.health = profile.health;
          user.emotionalGoals = profile.emotionalGoals;
          user.yogaExperience = profile.yogaExperience;
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }

        Alert.alert('Success', 'Profile updated successfully!');
        setEditing(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile save error:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    loadProfile(); // Reload original data
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loading}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-left"
            iconColor="white"
            size={28}
            onPress={() => navigation.goBack()}
          />
          <Title style={styles.headerTitle}>My Profile</Title>
          <IconButton
            icon={editing ? 'close' : 'pencil'}
            iconColor="white"
            size={24}
            onPress={() => editing ? handleCancel() : setEditing(true)}
          />
        </View>

        <View style={styles.avatarSection}>
          <Avatar.Text
            size={100}
            label={profile.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
            style={styles.avatar}
          />
          <Title style={styles.userName}>{profile.name}</Title>
          <Text style={styles.userEmail}>{profile.email}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* STATS CARD */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>📊 Your Stats</Title>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalSessions}</Text>
                  <Text style={styles.statLabel}>Total Sessions</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.completedSessions}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.avgCompletion}%</Text>
                  <Text style={styles.statLabel}>Avg Completion</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalPosesCompleted}</Text>
                  <Text style={styles.statLabel}>Poses Done</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* PROFILE INFO CARD */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>👤 Personal Information</Title>

              <TextInput
                label="Full Name"
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                mode="outlined"
                style={styles.input}
                disabled={!editing}
                left={<TextInput.Icon icon="account" />}
              />

              <TextInput
                label="Email"
                value={profile.email}
                mode="outlined"
                style={styles.input}
                disabled={true}
                left={<TextInput.Icon icon="email" />}
              />

              <TextInput
                label="Age"
                value={profile.age}
                onChangeText={(text) => setProfile({ ...profile, age: text })}
                mode="outlined"
                style={styles.input}
                disabled={!editing}
                keyboardType="numeric"
                left={<TextInput.Icon icon="calendar" />}
              />

              <TextInput
                label="Gender"
                value={profile.gender}
                mode="outlined"
                style={styles.input}
                disabled={true}
                left={<TextInput.Icon icon="gender-male-female" />}
              />

              <TextInput
                label="Health Conditions (Optional)"
                value={profile.health}
                onChangeText={(text) => setProfile({ ...profile, health: text })}
                mode="outlined"
                style={styles.input}
                disabled={!editing}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="heart-pulse" />}
              />

              <TextInput
                label="Yoga Experience"
                value={profile.yogaExperience}
                mode="outlined"
                style={styles.input}
                disabled={true}
                left={<TextInput.Icon icon="yoga" />}
              />
            </Card.Content>
          </Card>

          {/* EMOTIONAL GOALS */}
          {profile.emotionalGoals && profile.emotionalGoals.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>🎯 Emotional Goals</Title>
                <View style={styles.goalsContainer}>
                  {profile.emotionalGoals.map((goal, index) => (
                    <Chip
                      key={index}
                      style={styles.goalChip}
                      textStyle={styles.goalChipText}
                    >
                      {goal}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* SAVE BUTTON */}
          {editing && (
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={[styles.button, styles.cancelButton]}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={[styles.button, styles.saveButton]}
                loading={saving}
                disabled={saving}
              >
                Save Changes
              </Button>
            </View>
          )}

          {/* VIEW HISTORY BUTTON */}
          {!editing && (
            <Button
              mode="contained"
              onPress={() => navigation.navigate('History')}
              style={styles.historyButton}
              icon="history"
            >
              View Session History
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatar: {
    backgroundColor: 'white',
  },
  userName: {
    color: 'white',
    fontWeight: '700',
    marginTop: 12,
    fontSize: 24,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 18,
    marginBottom: 16,
    elevation: 4,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '700',
    fontSize: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#e8eaf6',
  },
  goalChipText: {
    color: '#667eea',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    borderColor: '#999',
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  historyButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#667eea',
  },
});

// Made with Bob
