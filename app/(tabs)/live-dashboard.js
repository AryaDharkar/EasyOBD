import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import {
  generateLiveData,
  generateDummyBatch,
} from "../utils/dummyDataGenerator";

export default function LiveDashboardScreen() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveData, setLiveData] = useState({
    speed: 0,
    rpm: 0,
    engineTemp: 85,
    fuelLevel: 50,
    throttle: 0,
    engineLoad: 0,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startSimulation = () => {
    setIsSimulating(true);
    setRecordCount(0);

    // Update live data every 1 second
    intervalRef.current = setInterval(() => {
      const newData = generateLiveData();
      setLiveData(newData);
      setRecordCount((prev) => prev + 1);
    }, 1000);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleSendBatch = async () => {
    try {
      setIsUploading(true);

      // Get user and vehicle data
      const userStr = await AsyncStorage.getItem("user");
      const vehicleId = await AsyncStorage.getItem("selectedVehicleId");

      if (!userStr || !vehicleId) {
        Alert.alert("Error", "Please login and select a vehicle first");
        return;
      }

      const user = JSON.parse(userStr);
      const deviceId = "OBD-SIMULATOR-001";

      // Generate dummy batch (20 records)
      const batchRecords = generateDummyBatch(
        user._id,
        vehicleId,
        deviceId,
        20,
      );

      console.log("Uploading batch:", batchRecords.length, "records");

      // Upload to backend
      const response = await api.uploadOBDData(vehicleId, batchRecords);

      Alert.alert(
        "Success! ✅",
        `Uploaded ${batchRecords.length} OBD records to server.\n\n` +
          `The ML system will analyze this data within 1 minute and generate a health report.\n\n` +
          `Go to Overview tab to see the report!`,
        [{ text: "OK" }],
      );

      console.log("Upload response:", response);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        error.message || "Failed to send batch to server",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Live Dashboard</Text>
        <Text style={styles.subtitle}>
          {isSimulating ? "Simulation Running..." : "Ready to simulate"}
        </Text>
      </View>

      {/* Dashboard Cards */}
      <View style={styles.cardsContainer}>
        <View style={[styles.card, { backgroundColor: "#3B82F6" }]}>
          <Text style={styles.cardLabel}>Speed</Text>
          <Text style={styles.cardValue}>
            {Math.round(liveData.speed)} km/h
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#8B5CF6" }]}>
          <Text style={styles.cardLabel}>RPM</Text>
          <Text style={styles.cardValue}>{Math.round(liveData.rpm)}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#EF4444" }]}>
          <Text style={styles.cardLabel}>Engine Temp</Text>
          <Text style={styles.cardValue}>
            {Math.round(liveData.engineTemp)}°C
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#10B981" }]}>
          <Text style={styles.cardLabel}>Fuel Level</Text>
          <Text style={styles.cardValue}>
            {Math.round(liveData.fuelLevel)}%
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#F59E0B" }]}>
          <Text style={styles.cardLabel}>Throttle</Text>
          <Text style={styles.cardValue}>{Math.round(liveData.throttle)}%</Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#06B6D4" }]}>
          <Text style={styles.cardLabel}>Engine Load</Text>
          <Text style={styles.cardValue}>
            {Math.round(liveData.engineLoad)}%
          </Text>
        </View>
      </View>

      {/* Simulation Controls */}
      <View style={styles.controlsSection}>
        <Text style={styles.sectionTitle}>Dummy Data Simulation</Text>
        <Text style={styles.sectionSubtitle}>
          Simulates live OBD data locally (updates every 1 second)
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, isSimulating && styles.stopButton]}
          onPress={isSimulating ? stopSimulation : startSimulation}
        >
          <Text style={styles.buttonText}>
            {isSimulating ? "⏹ Stop Simulation" : "▶️ Start Simulation"}
          </Text>
        </TouchableOpacity>

        {isSimulating && (
          <View style={styles.statsBox}>
            <Text style={styles.statsText}>
              📊 Records Generated: {recordCount}
            </Text>
            <Text style={styles.statsText}>
              ⏱ Duration: {Math.floor(recordCount / 60)}:
              {(recordCount % 60).toString().padStart(2, "0")}
            </Text>
          </View>
        )}
      </View>

      {/* Upload Section */}
      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Upload to Server</Text>
        <Text style={styles.sectionSubtitle}>
          Generate 20 dummy OBD records and send to backend for ML analysis
        </Text>

        <TouchableOpacity
          style={[
            styles.uploadButton,
            isUploading && styles.uploadButtonDisabled,
          ]}
          onPress={handleSendBatch}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📤 Send Batch to Server</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 This sends dummy data to your backend → Stores in DB → ML cron
            analyzes it → Generates health report
          </Text>
        </View>
      </View>

      {/* Flow Explanation */}
      <View style={styles.flowSection}>
        <Text style={styles.flowTitle}>How It Works:</Text>
        <View style={styles.flowStep}>
          <Text style={styles.flowNumber}>1</Text>
          <Text style={styles.flowText}>
            App generates 20 dummy OBD records with realistic data
          </Text>
        </View>
        <View style={styles.flowStep}>
          <Text style={styles.flowNumber}>2</Text>
          <Text style={styles.flowText}>
            Sends to POST /vehicles/:id/obd endpoint
          </Text>
        </View>
        <View style={styles.flowStep}>
          <Text style={styles.flowNumber}>3</Text>
          <Text style={styles.flowText}>Backend stores records in MongoDB</Text>
        </View>
        <View style={styles.flowStep}>
          <Text style={styles.flowNumber}>4</Text>
          <Text style={styles.flowText}>
            ML cron job runs every minute, analyzes batches
          </Text>
        </View>
        <View style={styles.flowStep}>
          <Text style={styles.flowNumber}>5</Text>
          <Text style={styles.flowText}>
            AI generates health report with insights
          </Text>
        </View>
        <View style={styles.flowStep}>
          <Text style={styles.flowNumber}>6</Text>
          <Text style={styles.flowText}>View report in Overview tab!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  card: {
    width: "47%",
    margin: "1.5%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  cardLabel: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  controlsSection: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  uploadSection: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  uploadButton: {
    backgroundColor: "#1E40AF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  statsBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#E0E7FF",
    borderRadius: 8,
  },
  statsText: {
    fontSize: 14,
    color: "#3730A3",
    marginBottom: 4,
    fontWeight: "500",
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#92400E",
    lineHeight: 20,
  },
  flowSection: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  flowStep: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  flowNumber: {
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
  flowText: {
    flex: 1,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    paddingTop: 4,
  },
});
