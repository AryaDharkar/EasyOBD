import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ProgressBarAndroid,
  ProgressViewIOS,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getHardcodedSeedCsv,
  getHardcodedSeedCsvRecordCount,
} from "../data/obdSeedCsv";

export default function OverviewScreen() {
  const [latestReport, setLatestReport] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isBleConnected, setIsBleConnected] = useState(false);
  const [bleDeviceName, setBleDeviceName] = useState("");
  const csvRecordCount = useMemo(() => getHardcodedSeedCsvRecordCount(), []);
  const recordsRequired = progress?.recordsRequired || 100;
  const displayCollectedRecords = csvRecordCount;
  const displayProgressPercent = Math.min(
    100,
    Math.round((displayCollectedRecords / recordsRequired) * 100)
  );
  const displayProgressMessage =
    displayCollectedRecords >= recordsRequired
      ? "You have enough data! Generate a report now."
      : `Collecting data: ${displayCollectedRecords}/${recordsRequired} records`;
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const bleConnectedRaw = await AsyncStorage.getItem("connectedObdDevice");
      if (!bleConnectedRaw) {
        setIsBleConnected(false);
        setBleDeviceName("");
        setSelectedVehicleId(null);
        setLatestReport(null);
        setProgress(null);
        setIsLoading(false);
        return;
      }

      const bleConnected = JSON.parse(bleConnectedRaw);
      setIsBleConnected(true);
      setBleDeviceName(bleConnected?.name || "OBD Device");

      // Get first vehicle
      const vehiclesResponse = await api.getVehicles();
      const vehicles = vehiclesResponse.vehicles || [];

      if (vehicles.length === 0) {
        const created = await api.addVehicle({
          manufacturer: "Generic",
          model: "Auto-Created",
          year: new Date().getFullYear(),
          engineType: "PETROL",
        });

        const createdVehicleId = created?.vehicle?._id;
        if (!createdVehicleId) {
          setSelectedVehicleId(null);
          setProgress(null);
          setLatestReport(null);
          setIsLoading(false);
          return;
        }

        setSelectedVehicleId(createdVehicleId);
        await AsyncStorage.setItem("selectedVehicleId", createdVehicleId);

        const progressData = await api.getCollectionProgress(createdVehicleId);
        setProgress(progressData?.data || null);
        setLatestReport(null);
        setIsLoading(false);
        return;
      }

      const vehicleId = vehicles[0]._id;
      setSelectedVehicleId(vehicleId);
      await AsyncStorage.setItem("selectedVehicleId", vehicleId);

      // Fetch progress
      const progressData = await api.getCollectionProgress(vehicleId);
      setProgress(progressData?.data || null);

      // Fetch latest diagnostic only if data is sufficient
      if (progressData?.data?.canGenerate) {
        const diagnostic = await api.getLatestDiagnostic(vehicleId);
        setLatestReport(diagnostic);
      }
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

  const resolveVehicleId = async () => {
    if (selectedVehicleId) {
      return selectedVehicleId;
    }

    const storedVehicleId = await AsyncStorage.getItem("selectedVehicleId");
    if (storedVehicleId) {
      setSelectedVehicleId(storedVehicleId);
      return storedVehicleId;
    }

    const vehiclesResponse = await api.getVehicles();
    const vehicles = vehiclesResponse.vehicles || [];
    if (!vehicles.length) {
      const created = await api.addVehicle({
        manufacturer: "Generic",
        model: "Auto-Created",
        year: new Date().getFullYear(),
        engineType: "PETROL",
      });

      const createdVehicleId = created?.vehicle?._id;
      if (!createdVehicleId) {
        return null;
      }

      await AsyncStorage.setItem("selectedVehicleId", createdVehicleId);
      setSelectedVehicleId(createdVehicleId);
      return createdVehicleId;
    }

    const vehicleId = vehicles[0]._id;
    await AsyncStorage.setItem("selectedVehicleId", vehicleId);
    setSelectedVehicleId(vehicleId);
    return vehicleId;
  };

  const handleGenerateReport = async () => {
    const vehicleId = await resolveVehicleId();
    if (!vehicleId) {
      Alert.alert("Error", "No vehicle selected");
      return;
    }

    setIsGenerating(true);
    try {
      const shouldSendSeedCsv = Number(progress?.recordsCollected || 0) === 0;
      const seedCsv = shouldSendSeedCsv ? getHardcodedSeedCsv() : "";
      const report = await api.generateReport(vehicleId, false, seedCsv);
      setLatestReport(report?.data || null);
      Alert.alert("Success!", "Report generated successfully!");
      // Refresh data after generation
      setTimeout(loadData, 1000);
    } catch (error) {
      console.error("Generate report error:", error);
      Alert.alert(
        "Generation Failed",
        error.message || "Failed to generate report"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getHealthScoreColor = (score) => {
    if (!score) return "#9CA3AF";
    if (score >= 75) return "#10B981";
    if (score >= 50) return "#F59E0B";
    return "#EF4444";
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

  if (!isBleConnected) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🚗</Text>
        <Text style={styles.emptyTitle}>No Vehicle Found</Text>
        <Text style={styles.emptyText}>
          Connect an OBD BLE device from the Live Data tab to continue.
        </Text>
      </View>
    );
  }

  // Show collecting data message if below threshold
  if (!progress?.canGenerate) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.collectingDataContainer}>
          <Text style={styles.collectingIcon}>📊</Text>
          <Text style={styles.collectingTitle}>Collecting Data</Text>
          <Text style={styles.connectedDeviceText}>Connected: {bleDeviceName}</Text>
          <Text style={styles.collectingText}>
            Please drive and let the OBD module collect more data for accurate
            diagnosis.
          </Text>

          <TouchableOpacity
            style={[
              styles.generateButton,
              (isGenerating || !isBleConnected) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateReport}
            disabled={isGenerating || !isBleConnected}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.generateButtonText}>Generating...</Text>
              </>
            ) : (
              <Text style={styles.generateButtonText}>🔄 Generate New Report</Text>
            )}
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Data Collection Progress</Text>
              <Text style={styles.progressNumbers}>
                {displayCollectedRecords} / {recordsRequired} records
              </Text>
            </View>

            {Platform.OS === "ios" ? (
              <ProgressViewIOS
                style={styles.progressBar}
                progress={displayProgressPercent / 100}
                progressTintColor="#1E40AF"
              />
            ) : (
              <ProgressBarAndroid
                style={styles.progressBar}
                progress={displayProgressPercent / 100}
                color="#1E40AF"
              />
            )}

            <Text style={styles.progressMessage}>{displayProgressMessage}</Text>
          </View>

          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>What To Do Next</Text>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Keep your OBD device connected while data is being collected.
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Pull down to refresh and track record collection progress.
              </Text>
            </View>

            <View style={styles.instructionStep}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Tap Generate New Report once enough records are available.
              </Text>
            </View>
          </View>

        </View>
      </ScrollView>
    );
  }

  // Show report if available
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Generate Report Button */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          (isGenerating || !isBleConnected) && styles.generateButtonDisabled,
        ]}
        onPress={handleGenerateReport}
        disabled={isGenerating || !isBleConnected}
      >
        {isGenerating ? (
          <>
            <ActivityIndicator color="#fff" />
            <Text style={styles.generateButtonText}>Generating...</Text>
          </>
        ) : (
          <Text style={styles.generateButtonText}>
            🔄 Generate New Report
          </Text>
        )}
      </TouchableOpacity>

      {latestReport && (
        <>
          {(() => {
            const healthScore = latestReport.aiSnapshot?.healthScore ?? latestReport.aiSnapshot?.confidenceScore ?? 0;
            const confidenceScore = latestReport.aiSnapshot?.confidenceScore ?? 0;
            return (
              <>
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
                {healthScore || "N/A"}
              </Text>
              <Text style={styles.scoreLabel}>
                {getHealthScoreLabel(healthScore)}
              </Text>
            </View>
            <View
              style={[
                styles.healthBar,
                {
                  backgroundColor: getHealthScoreColor(
                    healthScore
                  ),
                },
                { width: `${healthScore || 0}%` },
              ]}
            />
            <Text style={styles.confidenceSubtext}>
              Report confidence: {confidenceScore}%
            </Text>
          </View>
              </>
            );
          })()}

          {/* Latest Issue Summary */}
          {latestReport.aiSnapshot?.likely_issue && (
            <View style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <Text style={styles.issueIcon}>⚠️</Text>
                <Text style={styles.issueTitle}>Latest Analysis</Text>
              </View>
              <Text style={styles.issueText}>
                {latestReport.aiSnapshot.likely_issue}
              </Text>
            </View>
          )}

          {/* Affected Parts */}
          {latestReport.aiSnapshot?.affected_parts &&
            latestReport.aiSnapshot.affected_parts.length > 0 && (
              <View style={styles.partsCard}>
                <Text style={styles.cardTitle}>Affected Components</Text>
                <View style={styles.partsList}>
                  {latestReport.aiSnapshot.affected_parts.map((part, index) => (
                    <View key={index} style={styles.partChip}>
                      <Text style={styles.partText}>{part}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Summary */}
          {latestReport.aiSnapshot?.summary && (
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>AI Summary</Text>
              <Text style={styles.summaryText}>
                {latestReport.aiSnapshot.summary}
              </Text>
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
        </>
      )}

      {!latestReport && progress?.canGenerate && (
        <View style={styles.noReportCard}>
          <Text style={styles.noReportIcon}>📋</Text>
          <Text style={styles.noReportTitle}>No Reports Yet</Text>
          <Text style={styles.noReportText}>
            Tap the button above to generate your first health report!
          </Text>
        </View>
      )}
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
  connectedDeviceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 10,
  },
  collectingDataContainer: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    marginTop: 40,
  },
  collectingIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  collectingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  collectingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  progressSection: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  progressInfo: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  progressNumbers: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E40AF",
  },
  progressBar: {
    height: 8,
    marginVertical: 12,
    borderRadius: 4,
  },
  progressMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  instructionsCard: {
    width: "100%",
    backgroundColor: "#E0E7FF",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1E40AF",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E40AF",
    marginBottom: 12,
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E40AF",
    color: "#fff",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "bold",
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: "#10B981",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  emptyReportCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  noReportCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  noReportIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  noReportTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  noReportText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
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
  confidenceSubtext: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
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
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E40AF",
  },
  fullReportText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E40AF",
  },
  arrow: {
    fontSize: 20,
    color: "#1E40AF",
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
  timestamp: {
    fontSize: 11,
    color: "#999",
    marginHorizontal: 16,
    marginBottom: 32,
    textAlign: "right",
  },
});
  