import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import elm from "./services/elm327";
import { useTheme } from "./context/ThemeContext";

export default function DeviceSetupScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [step, setStep] = useState("intro"); // intro, scan, connecting, success
  const scanTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const router = useRouter();
  const OBD_LABELS = ["obd", "elm", "elm327", "esp32", "vlink", "vgate", "obdii", "obd2"];

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, []);

  const safeStopScan = () => {
    // elm.scan manages scan lifecycle internally via timeout.

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    if (isMountedRef.current) {
      setScanning(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        granted["android.permission.BLUETOOTH_SCAN"] === "granted" &&
        granted["android.permission.BLUETOOTH_CONNECT"] === "granted" &&
        granted["android.permission.ACCESS_FINE_LOCATION"] === "granted"
      );
    }
    return true;
  };

  const startScan = async () => {
    const ok = await requestPermissions();
    if (!ok) {
      Alert.alert("Permissions Denied", "Bluetooth permissions are required to connect to OBD modules");
      return;
    }

    setDevices([]);
    setScanning(true);
    setStep("scan");

    scanTimeoutRef.current = setTimeout(() => {
      safeStopScan();
    }, 15000);

    try {
      const scanned = await elm.scan(7000, "auto");
      if (!isMountedRef.current) return;

      const filtered = scanned.filter((device) => {
        const deviceName = (device?.name || device?.localName || "").toLowerCase();
        return OBD_LABELS.some((label) => deviceName.includes(label));
      });

      setDevices(filtered);
    } catch (error) {
      Alert.alert("Scan Failed", error?.message || "Could not start BLE scan");
    } finally {
      safeStopScan();
    }
  };

  const skipDeviceSetup = async () => {
    // Store setup as skipped
    await AsyncStorage.setItem("deviceSetupSkipped", "true");
    router.replace("/(tabs)/overview");
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Device Setup?",
      "You can connect your OBD device later from the settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: skipDeviceSetup
        }
      ]
    );
  };

  const handleDeviceSelect = async (device) => {
    setConnectingId(device.id);
    setSelectedDevice(device);
    setStep("connecting");

    try {
      safeStopScan();

      // Connect using shared BLE service (same manager as Live Dashboard).
      await elm.connect(device.id, "auto");

      // Store device info
      await AsyncStorage.setItem(
        "connectedObdDevice",
        JSON.stringify({
          id: device.id,
          name: device.name || device.localName || device.id,
          connectedAt: Date.now(),
        })
      );

      setStep("success");
      Alert.alert(
        "Success",
        `Connected to ${device.name || device.localName || device.id}`
      );

      // Auto-proceed after 2 seconds
      setTimeout(() => {
        if (isMountedRef.current) {
          router.replace("/(tabs)/overview");
        }
      }, 2000);
    } catch (error) {
      setStep("scan");
      Alert.alert("Connection Failed", error.message || "Failed to connect to device");
      setConnectingId(null);
    }
  };

  if (step === "intro") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.introContent}>
          <MaterialCommunityIcons name="car-wireless" size={80} color={colors.accent} style={styles.introIcon} />
          <Text style={styles.introTitle}>Connect OBD Module</Text>
          <Text style={styles.introSubtitle}>
            Set up your vehicle diagnostic device
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Why Connect Now?</Text>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>
                Start collecting vehicle data immediately
              </Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>
                Automatic anomaly detection with edge ML
              </Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>
                Real-time health monitoring and alerts
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startScan}
          >
            <Text style={styles.primaryButtonText}>Find OBD Device</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
          >
            <Text style={styles.secondaryButtonText}>Skip For Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (step === "scan") {
    return (
      <View style={styles.container}>
        <View style={styles.scanHeader}>
          <Text style={styles.scanTitle}>
            {scanning ? "Scanning for devices..." : "Available Devices"}
          </Text>
          {scanning && <ActivityIndicator color={colors.accent} />}
        </View>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.deviceItem}
              onPress={() => handleDeviceSelect(item)}
            >
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{item.name}</Text>
                <Text style={styles.deviceId}>{item.id}</Text>
                {item.rssi && <Text style={styles.rssi}>Signal: {item.rssi}%</Text>}
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            scanning ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={styles.emptyText}>Scanning for OBD devices...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="radar" size={60} color={colors.accent} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No devices found</Text>
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={startScan}
                >
                  <Text style={styles.rescanText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleSkip}
        >
          <Text style={styles.cancelText}>Skip Setup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "connecting") {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 20 }} />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingText}>
            {selectedDevice?.name}
          </Text>
        </View>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="check-decagram" size={80} color="#10B981" style={styles.successIcon} />
          <Text style={styles.successTitle}>Device Connected!</Text>
          <Text style={styles.successText}>
            {selectedDevice?.name}
          </Text>
          <Text style={styles.successSubtext}>
            Your OBD module is now paired and ready to collect data
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  introContent: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100%",
  },
  introIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.accent,
    marginBottom: 8,
    textAlign: "center",
  },
  introSubtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 32,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 0,
    marginBottom: 32,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.text,
    marginBottom: 12,
  },
  benefit: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 18,
    color: "#10B981",
    marginRight: 12,
    fontWeight: "bold",
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 0,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 0,
    width: "100%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.accent,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "bold",
  },
  scanHeader: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  deviceItem: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    borderRadius: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  rssi: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "500",
  },
  arrow: {
    fontSize: 24,
    color: colors.accent,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 16,
  },
  rescanButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 0,
  },
  rescanText: {
    color: colors.onAccent,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 0,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "bold",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  connectingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  connectingText: {
    fontSize: 16,
    color: colors.muted,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  successSubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});


