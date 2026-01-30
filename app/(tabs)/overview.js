import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OverviewScreen() {
  const [latestReport, setLatestReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get first vehicle (you can add vehicle selection later)
      const vehiclesResponse = await api.getVehicles();
      const vehicles = vehiclesResponse.vehicles || [];

      if (vehicles.length === 0) {
        setIsLoading(false);
        return;
      }

      const vehicleId = vehicles[0]._id;
      setSelectedVehicleId(vehicleId);

      // Store vehicle ID for use in other screens
      await AsyncStorage.setItem("selectedVehicleId", vehicleId);

      // Fetch latest diagnostic
      const diagnostic = await api.getLatestDiagnostic(vehicleId);
      setLatestReport(diagnostic);
    } catch (error) {
      console.error("Load overview error:", error);
      Alert.alert("Error", "Failed to load health overview");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getHealthScoreColor = (score) => {
    if (!score) return "#9CA3AF";
    if (score >= 75) return "#10B981"; // Green
    if (score >= 50) return "#F59E0B"; // Orange
    return "#EF4444"; // Red
  };

  const getHealthScoreLabel = (score) => {
    if (!score) return "Unknown";
    if (score >= 75) return "Excellent";
    if (score >= 50) return "Fair";
    return "Poor";
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  if (!selectedVehicleId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🚗</Text>
        <Text style={styles.emptyTitle}>No Vehicle Found</Text>
        <Text style={styles.emptyText}>
          Please add a vehicle first to see health reports
        </Text>
      </View>
    );
  }

  if (!latestReport) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.emptyReportContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Health Report Available</Text>
          <Text style={styles.emptyText}>
            Upload some OBD data to generate your first health report. The ML
            system analyzes your data automatically every minute.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(tabs)/live-dashboard")}
          >
            <Text style={styles.primaryButtonText}>Go to Live Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const { aiSnapshot } = latestReport;
  const healthScore = aiSnapshot?.confidenceScore || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Health Score Card */}
      <View style={styles.healthScoreCard}>
        <Text style={styles.cardTitle}>Vehicle Health</Text>
        <View style={styles.scoreCircle}>
          <Text
            style={[
              styles.scoreNumber,
              { color: getHealthScoreColor(healthScore) },
            ]}
          >
            {healthScore}
          </Text>
          <Text style={styles.scoreLabel}>
            {getHealthScoreLabel(healthScore)}
          </Text>
        </View>
        <View
          style={[
            styles.healthBar,
            { backgroundColor: getHealthScoreColor(healthScore) },
            { width: `${healthScore}%` },
          ]}
        />
      </View>

      {/* Latest Issue Summary */}
      {aiSnapshot?.likely_issue && (
        <View style={styles.issueCard}>
          <View style={styles.issueHeader}>
            <Text style={styles.issueIcon}>⚠️</Text>
            <Text style={styles.issueTitle}>Latest Analysis</Text>
          </View>
          <Text style={styles.issueText}>{aiSnapshot.likely_issue}</Text>
        </View>
      )}

      {/* Affected Parts */}
      {aiSnapshot?.affected_parts && aiSnapshot.affected_parts.length > 0 && (
        <View style={styles.partsCard}>
          <Text style={styles.cardTitle}>Affected Components</Text>
          <View style={styles.partsList}>
            {aiSnapshot.affected_parts.map((part, index) => (
              <View key={index} style={styles.partChip}>
                <Text style={styles.partText}>{part}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Summary */}
      {aiSnapshot?.summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>AI Summary</Text>
          <Text style={styles.summaryText}>{aiSnapshot.summary}</Text>
        </View>
      )}

      {/* View Full Report Button */}
      <TouchableOpacity
        style={styles.fullReportButton}
        onPress={() => router.push("/health-detail")}
      >
        <Text style={styles.fullReportText}>View Full Report</Text>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      {/* Last Updated */}
      <Text style={styles.timestamp}>
        Last updated: {new Date(latestReport.createdAt).toLocaleString()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyReportContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  healthScoreCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  scoreCircle: {
    alignItems: "center",
    marginVertical: 16,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 18,
    color: "#666",
    marginTop: 8,
  },
  healthBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 16,
    alignSelf: "stretch",
  },
  issueCard: {
    backgroundColor: "#FEF3C7",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  issueIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#92400E",
  },
  issueText: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 20,
  },
  partsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  partsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  partChip: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  partText: {
    fontSize: 13,
    color: "#3730A3",
    fontWeight: "500",
  },
  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
  },
  fullReportButton: {
    backgroundColor: "#1E40AF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fullReportText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  arrow: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  timestamp: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    marginBottom: 24,
  },
});
