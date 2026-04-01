import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import api from "./services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HealthDetailScreen() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const vehicleId = await AsyncStorage.getItem("selectedVehicleId");

      if (!vehicleId) {
        Alert.alert("Error", "No vehicle selected");
        router.back();
        return;
      }

      const response = await api.getDiagnostics(vehicleId, { limit: 10 });
      setReports(response.data || []);
    } catch (error) {
      console.error("Load reports error:", error);
      Alert.alert("Error", "Failed to load health reports");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getConfidenceColor = (score) => {
    if (score >= 75) return "#10B981";
    if (score >= 50) return "#F59E0B";
    return "#EF4444";
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>Loading detailed reports...</Text>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Reports Yet</Text>
        <Text style={styles.emptyText}>
          Upload OBD data to generate health reports
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonSmall}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Full Health Report</Text>
      </View>

      {/* Reports List */}
      {reports.map((report, index) => (
        <View key={report._id} style={styles.reportCard}>
          {(() => {
            const healthScore = report.aiSnapshot?.healthScore ?? report.aiSnapshot?.confidenceScore ?? 0;
            const confidenceScore = report.aiSnapshot?.confidenceScore ?? 0;
            return (
              <>
          {/* Time Window */}
          <View style={styles.reportHeader}>
            <View style={styles.timeChip}>
              <Text style={styles.timeText}>
                {formatDate(report.timeWindow.start)} -{" "}
                {formatDate(report.timeWindow.end)}
              </Text>
            </View>
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.healthBadge,
                  {
                    backgroundColor: getConfidenceColor(healthScore),
                  },
                ]}
              >
                <Text style={styles.confidenceText}>{healthScore}% health</Text>
              </View>
              <View
                style={[
                  styles.confidenceBadge,
                  {
                    backgroundColor: getConfidenceColor(confidenceScore),
                  },
                ]}
              >
                <Text style={styles.confidenceText}>{confidenceScore}% confidence</Text>
              </View>
            </View>
          </View>
              </>
            );
          })()}

          {/* Likely Issue */}
          {report.aiSnapshot?.likely_issue && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Detected Issue</Text>
              <Text style={styles.issueText}>
                {report.aiSnapshot.likely_issue}
              </Text>
            </View>
          )}

          {/* Affected Parts */}
          {report.aiSnapshot?.affected_parts &&
            report.aiSnapshot.affected_parts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚙️ Affected Parts</Text>
                <View style={styles.partsList}>
                  {report.aiSnapshot.affected_parts.map((part, idx) => (
                    <View key={idx} style={styles.partChip}>
                      <Text style={styles.partText}>{part}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* AI Summary */}
          {report.aiSnapshot?.summary && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 AI Analysis</Text>
              <Text style={styles.summaryText}>
                {report.aiSnapshot.summary}
              </Text>
            </View>
          )}

          {/* Batch IDs */}
          <View style={styles.metaSection}>
            <Text style={styles.metaLabel}>Analyzed Batches:</Text>
            <Text style={styles.metaValue}>
              {report.batchIds.length} batches
            </Text>
          </View>

          {/* Timestamp */}
          <Text style={styles.timestamp}>
            Generated: {new Date(report.createdAt).toLocaleString()}
          </Text>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Reports are automatically generated by AI every minute
        </Text>
      </View>
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
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButtonSmall: {
    padding: 8,
    marginRight: 8,
  },
  backArrow: {
    fontSize: 24,
    color: "#1E40AF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  reportCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reportHeader: {
    marginBottom: 16,
  },
  timeChip: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#3730A3",
    fontWeight: "600",
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  healthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginRight: 8,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  confidenceText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  issueText: {
    fontSize: 14,
    color: "#EF4444",
    lineHeight: 20,
    fontWeight: "500",
  },
  partsList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  partChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  partText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
  },
  summaryText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
  },
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginTop: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: "#666",
  },
  metaValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
    textAlign: "right",
  },
  backButton: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
});
