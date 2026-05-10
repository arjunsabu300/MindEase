import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Title,
  Text,
  Card,
  Chip,
  ActivityIndicator,
  IconButton,
  Divider,
  Badge,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = 'https://mindease-px7s.onrender.com/api';

const HistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({
    totalSessions: 0,
    completedSessions: 0,
    completionRate: 0,
    emotionDistribution: {},
    mostCommonEmotion: 'neutral',
    averagePoseScore: 0,
    totalPosesCompleted: 0,
    bestPoseScore: 0,
    recentActivity: 0,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
        return;
      }

      // Fetch sessions
      const sessionsResponse = await fetch(`${API_URL}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const sessionsData = await sessionsResponse.json();

      if (sessionsData.success) {
        setSessions(sessionsData.sessions);
      }

      // Fetch summary stats
      const summaryResponse = await fetch(`${API_URL}/history/summary/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const summaryData = await summaryResponse.json();

      if (summaryData.success) {
        setSummary(summaryData.summary);
      }

    } catch (error) {
      console.error('History load error:', error);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: '#4CAF50',
      sad: '#2196F3',
      calm: '#9C27B0',
      angry: '#F44336',
      fearful: '#FF9800',
      neutral: '#757575',
    };
    return colors[emotion] || '#757575';
  };

  const getEmotionIcon = (emotion) => {
    const icons = {
      happy: '😊',
      sad: '😢',
      calm: '😌',
      angry: '😠',
      fearful: '😰',
      neutral: '😐',
    };
    return icons[emotion] || '😐';
  };

  const handleSessionPress = (session) => {
    Alert.alert(
      'Session Details',
      `Emotion: ${session.emotion}\n` +
      `Completed: ${session.completed ? 'Yes' : 'No'}\n` +
      `Completion: ${Math.round((session.completionRatio || 0) * 100)}%\n` +
      `Poses Completed: ${session.totalPosesCompleted || 0}\n` +
      `Average Score: ${Math.round(session.averagePoseScore || 0)}%\n` +
      `Best Score: ${Math.round(session.bestPoseScore || 0)}%\n` +
      `Date: ${new Date(session.createdAt).toLocaleString()}`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loading}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading history...</Text>
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
          <Title style={styles.headerTitle}>Session History</Title>
          <IconButton
            icon="refresh"
            iconColor="white"
            size={24}
            onPress={onRefresh}
          />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* SUMMARY CARD */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📈 Summary</Title>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.totalSessions}</Text>
                <Text style={styles.summaryLabel}>Total Sessions</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.completedSessions}</Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.completionRate}%</Text>
                <Text style={styles.summaryLabel}>Completion Rate</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.recentActivity}</Text>
                <Text style={styles.summaryLabel}>Last 7 Days</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Most Common Emotion</Text>
                <View style={styles.emotionBadge}>
                  <Text style={styles.emotionIcon}>
                    {getEmotionIcon(summary.mostCommonEmotion)}
                  </Text>
                  <Text style={styles.emotionText}>
                    {summary.mostCommonEmotion}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Best Pose Score</Text>
                <Text style={styles.statValue}>{summary.bestPoseScore}%</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Avg Pose Score</Text>
                <Text style={styles.statValue}>{summary.averagePoseScore}%</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Poses</Text>
                <Text style={styles.statValue}>{summary.totalPosesCompleted}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* EMOTION DISTRIBUTION */}
        {Object.keys(summary.emotionDistribution).length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>🎭 Emotion Distribution</Title>
              <View style={styles.emotionChips}>
                {Object.entries(summary.emotionDistribution).map(([emotion, count]) => (
                  <Chip
                    key={emotion}
                    style={[
                      styles.emotionChip,
                      { backgroundColor: getEmotionColor(emotion) + '20' }
                    ]}
                    textStyle={{ color: getEmotionColor(emotion) }}
                  >
                    {getEmotionIcon(emotion)} {emotion}: {count}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* SESSIONS LIST */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              📋 Recent Sessions ({sessions.length})
            </Title>

            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No sessions yet</Text>
                <Text style={styles.emptySubtext}>
                  Start your wellness journey by detecting your emotion!
                </Text>
              </View>
            ) : (
              sessions.map((session, index) => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionItem}>
                    <View style={styles.sessionHeader}>
                      <View style={styles.sessionLeft}>
                        <Text style={styles.sessionEmotionIcon}>
                          {getEmotionIcon(session.emotion)}
                        </Text>
                        <View>
                          <Text style={styles.sessionEmotion}>
                            {session.emotion}
                          </Text>
                          <Text style={styles.sessionDate}>
                            {formatDate(session.createdAt)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.sessionRight}>
                        {session.completed ? (
                          <Chip
                            style={styles.completedChip}
                            textStyle={styles.completedChipText}
                            icon="check-circle"
                          >
                            Completed
                          </Chip>
                        ) : (
                          <Chip
                            style={styles.incompleteChip}
                            textStyle={styles.incompleteChipText}
                          >
                            Incomplete
                          </Chip>
                        )}
                      </View>
                    </View>

                    <View style={styles.sessionStats}>
                      <View style={styles.sessionStat}>
                        <Text style={styles.sessionStatLabel}>Completion</Text>
                        <Text style={styles.sessionStatValue}>
                          {Math.round((session.completionRatio || 0) * 100)}%
                        </Text>
                      </View>
                      
                      <View style={styles.sessionStat}>
                        <Text style={styles.sessionStatLabel}>Poses</Text>
                        <Text style={styles.sessionStatValue}>
                          {session.totalPosesCompleted || 0}
                        </Text>
                      </View>
                      
                      <View style={styles.sessionStat}>
                        <Text style={styles.sessionStatLabel}>Avg Score</Text>
                        <Text style={styles.sessionStatValue}>
                          {Math.round(session.averagePoseScore || 0)}%
                        </Text>
                      </View>
                    </View>

                    {session.poseHistory && session.poseHistory.length > 0 && (
                      <View style={styles.poseHistoryPreview}>
                        <Text style={styles.poseHistoryLabel}>
                          Poses: {session.poseHistory.map(p => p.poseId).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {index < sessions.length - 1 && <Divider style={styles.sessionDivider} />}
                </TouchableOpacity>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

export default HistoryScreen;

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
    paddingBottom: 24,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#667eea',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  emotionIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  emotionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    textTransform: 'capitalize',
  },
  emotionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  sessionItem: {
    paddingVertical: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionEmotionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  sessionEmotion: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#333',
  },
  sessionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  completedChip: {
    backgroundColor: '#4CAF50',
  },
  completedChipText: {
    color: 'white',
    fontSize: 11,
  },
  incompleteChip: {
    backgroundColor: '#FF9800',
  },
  incompleteChipText: {
    color: 'white',
    fontSize: 11,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
  },
  sessionStat: {
    alignItems: 'center',
  },
  sessionStatLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  sessionStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  poseHistoryPreview: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
  },
  poseHistoryLabel: {
    fontSize: 12,
    color: '#667eea',
  },
  sessionDivider: {
    marginVertical: 8,
  },
});

// Made with Bob
