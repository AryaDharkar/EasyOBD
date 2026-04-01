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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "./services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "./context/ThemeContext";

export default function HealthDetailScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const averageHealth = reports.length
    ? Math.round(
        reports.reduce(
          (sum, report) =>
            sum + (report.aiSnapshot?.healthScore ?? report.aiSnapshot?.confidenceScore ?? 0),
          0,
        ) / reports.length,
      )
    : 0;

  const averageConfidence = reports.length
    ? Math.round(
        reports.reduce(
          (sum, report) => sum + (report.aiSnapshot?.confidenceScore ?? 0),
          0,
        ) / reports.length,
      )
    : 0;

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

  const getSeverityAccent = (score) => {
    if (score >= 75) return "#2F7A4F";
    if (score >= 50) return "#8A6A1F";
    return "#8B3A3A";
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading detailed reports...</Text>
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="chart-box-outline" size={72} color={colors.accent} style={styles.emptyIcon} />
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
        <View>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSubtitle}>Latest health and confidence windows</Text>
        </View>
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryTileLabel}>Entries</Text>
          <Text style={styles.summaryTileValue}>{reports.length}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryTileLabel}>Avg Health</Text>
          <Text style={styles.summaryTileValue}>{averageHealth}%</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryTileLabel}>Avg Confidence</Text>
          <Text style={styles.summaryTileValue}>{averageConfidence}%</Text>
        </View>
      </View>

      {/* Reports List */}
      {reports.map((report) => (
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
                  <View
                    style={[
                      styles.severityPill,
                      {
                        borderColor: getSeverityAccent(healthScore),
                      },
                    ]}
                  >
                    <Text style={[styles.severityText, { color: getSeverityAccent(healthScore) }]}>
                      {healthScore >= 75 ? "STABLE" : healthScore >= 50 ? "WATCH" : "CRITICAL"}
                    </Text>
                  </View>
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
              <Text style={styles.sectionTitle}>Detected Issue</Text>
              <Text style={styles.issueText}>
                {report.aiSnapshot.likely_issue}
              </Text>
            </View>
          )}

          {/* Affected Parts */}
          {report.aiSnapshot?.affected_parts &&
            report.aiSnapshot.affected_parts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Affected Parts</Text>
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
              <Text style={styles.sectionTitle}>AI Analysis</Text>
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
          Reports are generated by the hybrid baseline + AI pipeline
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.muted,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButtonSmall: {
    padding: 8,
    marginRight: 8,
  },
  backArrow: {
    fontSize: 24,
    color: colors.accent,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryStrip: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  summaryTileLabel: {
    fontSize: 10,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryTileValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  reportCard: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 16,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportHeader: {
    marginBottom: 16,
  },
  timeChip: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    alignSelf: "flex-start",
  },
  healthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    alignSelf: "flex-start",
    marginRight: 8,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  confidenceText: {
    fontSize: 12,
    color: colors.onAccent,
    fontWeight: "bold",
  },
  severityPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 0,
    alignSelf: "flex-start",
    backgroundColor: colors.panel,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  issueText: {
    fontSize: 14,
    color: "#FCA5A5",
    lineHeight: 20,
    fontWeight: "500",
  },
  partsList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  partChip: {
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    marginRight: 8,
    marginBottom: 8,
  },
  partText: {
    fontSize: 13,
    color: colors.chipText,
    fontWeight: "500",
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  metaValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
    textAlign: "right",
  },
  backButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 0,
    marginTop: 16,
  },
  backButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    letterSpacing: 0.3,
  },
});


