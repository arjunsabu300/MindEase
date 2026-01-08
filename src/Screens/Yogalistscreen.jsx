import React from "react";
import { View, StyleSheet, FlatList, SafeAreaView, Platform, StatusBar, TouchableOpacity } from "react-native";
import { Text, Card, Chip } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function YogaListScreen({ route, navigation }) {
  // 1. Safe Destructuring with fallback to avoid crashes
  const { yogaPlan } = route.params || { yogaPlan: [] };

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  const getIntensityColor = (intensity) => {
    switch (intensity?.toLowerCase()) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return '#999';
    }
  };

  const renderItem = ({ item, index }) => (
    <Card style={styles.card} onPress={() => {}}>
      <View style={styles.cardContent}>
        
        <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{index + 1}</Text>
        </View>

        <View style={styles.infoContainer}>
            <Text style={styles.poseName}>{capitalize(item.id)}</Text>
            <View style={styles.metaRow}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#888" />
                <Text style={styles.metaText}>{item.duration} sec</Text>
            </View>
        </View>

        <Chip 
            mode="flat" 
            textStyle={styles.chipText}
            style={[styles.chip, { backgroundColor: getIntensityColor(item.intensity) }]}
        >
            {capitalize(item.intensity)}
        </Chip>

      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recommended Routine</Text>
        {/* Empty View for alignment spacer */}
        <View style={{ width: 24 }} /> 
      </View>

      <FlatList
        data={yogaPlan}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
            <Text style={styles.subTitle}>
                {yogaPlan.length} Exercises recommended for you
            </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF5EC",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: "#FFF5EC",
  },
  headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#1A1A1A",
  },
  listContainer: {
      padding: 20,
  },
  subTitle: {
      fontSize: 14,
      color: "#888",
      marginBottom: 16,
  },
  card: {
      marginBottom: 12,
      backgroundColor: "#fff",
      borderRadius: 16,
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: "#F5F5F5",
  },
  cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
  },
  numberBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: "#FFF0EB",
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
  },
  numberText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FF7F50",
  },
  infoContainer: {
      flex: 1,
  },
  poseName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1A1A1A",
      marginBottom: 4,
  },
  metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  metaText: {
      fontSize: 12,
      color: "#888",
      marginLeft: 4,
  },
  chip: {
      borderRadius: 12,
      height: 26,
      alignItems: 'center', 
      justifyContent: 'center'
  },
  chipText: {
      color: '#fff', 
      fontSize: 10, 
      fontWeight: '700',
      marginBottom: 2 // Tiny adjustment for centering text in small chips
  }
});