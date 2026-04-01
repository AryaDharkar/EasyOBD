import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import elm from "../services/elm327";

const POLL_PIDS = ["01 0C", "01 0D", "01 05", "01 04", "01 11", "01 0F", "01 0B", "01 42"];
const SOURCE_MODES = [
  { key: "auto", label: "Auto" },
  { key: "esp", label: "ESP" },
  { key: "elm", label: "ELM" },
];

const INITIAL_LIVE_DATA = {
  rpm: 0,
  speed: 0,
  engineTemp: 0,
  intakeTemp: 0,
  throttle: 0,
  engineLoad: 0,
  map: 0,
  voltage: 0,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatBleError = (error) => {
  if (!error) return "Unknown BLE error";
  const reason = error?.reason ? `reason=${error.reason}` : "";
  const code = error?.errorCode !== undefined ? `code=${error.errorCode}` : "";
  const att = error?.attErrorCode !== undefined ? `att=${error.attErrorCode}` : "";
  const msg = error?.message || String(error);
  return [msg, reason, code, att].filter(Boolean).join(" | ");
};

export default function LiveDashboardScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connectedName, setConnectedName] = useState("");
  const [sourceMode, setSourceMode] = useState("auto");

  const [liveData, setLiveData] = useState(INITIAL_LIVE_DATA);

  const intervalRef = useRef(null);
  const pidIndexRef = useRef(0);

  useEffect(() => {
    const bootstrapConnection = async () => {
      try {
        const primary = await AsyncStorage.getItem("connectedObdDevice");
        const legacy = primary
          ? null
          : await AsyncStorage.getItem("connectedOBDDevice");
        const stored = primary || legacy;

        if (!stored) return;

        const device = JSON.parse(stored);
        if (!device?.id) return;

        const ok = await requestPermissions();
        if (!ok) return;

        setIsConnecting(true);
        await elm.connect(device.id, sourceMode);
        elm.onRaw = handleRaw;
        await initializeElm();

        setIsConnected(true);
        setConnectedName(device.name || device.id);
        await AsyncStorage.setItem(
          "connectedObdDevice",
          JSON.stringify({
            id: device.id,
            name: device.name || device.id,
            connectedAt: Date.now(),
          }),
        );
        startPolling();
      } catch (error) {
        // Keep persisted selection; connection may fail transiently (range/BT state/permissions).
        console.log("Auto reconnect skipped:", error?.message || String(error));
      } finally {
        setIsConnecting(false);
      }
    };

    bootstrapConnection();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Keep BLE session alive across tab switches; user can disconnect explicitly.
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== "android") {
      return true;
    }

    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);

    return permissions.every((p) => granted[p] === "granted");
  };

  const handleScan = async () => {
    const ok = await requestPermissions();
    if (!ok) {
      Alert.alert("Permission required", "Bluetooth permissions are needed to scan OBD devices.");
      return;
    }

    try {
      setIsScanning(true);
      const scanned = await elm.scan(7000, sourceMode);
      setDevices(scanned);

      if (!scanned.length) {
        Alert.alert(
          "No device found",
          `No ${sourceMode.toUpperCase()} compatible device found nearby.`,
        );
      }
    } catch (error) {
      Alert.alert("Scan failed", formatBleError(error));
    } finally {
      setIsScanning(false);
    }
  };

  const initializeElm = async () => {
    const initCommands = ["ATZ", "ATE0", "ATL0", "ATH0", "ATSP0"];

    for (const cmd of initCommands) {
      await elm.send(cmd);
      await delay(140);
    }
  };

  const connectToELM327 = async (device) => {
    try {
      setIsConnecting(true);
      await elm.connect(device.id, sourceMode);

      elm.onRaw = handleRaw;
      await initializeElm();

      setIsConnected(true);
      setConnectedName(device.name || device.localName || device.id);
      await AsyncStorage.setItem(
        "connectedObdDevice",
        JSON.stringify({
          id: device.id,
          name: device.name || device.localName || device.id,
          connectedAt: Date.now(),
        }),
      );
      startPolling();

      Alert.alert("Connected", "ELM327 connected. Live polling started.");
    } catch (e) {
      Alert.alert("Connection Error", formatBleError(e));
      elm.close();
      setIsConnected(false);
      setConnectedName("");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    elm.close();
    setIsConnected(false);
    setConnectedName("");
    setLiveData(INITIAL_LIVE_DATA);
    AsyncStorage.removeItem("connectedObdDevice").catch(() => {});
  };

  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    pidIndexRef.current = 0;

    intervalRef.current = setInterval(() => {
      elm
        .send(POLL_PIDS[pidIndexRef.current])
        .catch((error) => console.log("PID poll error:", error.message));
      pidIndexRef.current = (pidIndexRef.current + 1) % POLL_PIDS.length;
    }, 500);
  };

  const update = (pid, value) => {
    setLiveData((prev) => {
      switch (pid) {
        case "0C":
          return { ...prev, rpm: value };
        case "0D":
          return { ...prev, speed: value };
        case "05":
          return { ...prev, engineTemp: value };
        case "0F":
          return { ...prev, intakeTemp: value };
        case "11":
          return { ...prev, throttle: value };
        case "04":
          return { ...prev, engineLoad: value };
        case "0B":
          return { ...prev, map: value };
        case "42":
          return { ...prev, voltage: value };
        default:
          return prev;
      }
    });
  };

  const handleRaw = (raw) => {
    const lines = raw
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== "OK" && l !== "?");

    for (const line of lines) {
      const parsed = elm.parsePID(line);
      if (parsed) {
        update(parsed.pid, parsed.value);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Live Dashboard</Text>
      <Text style={styles.subheader}>
        {isConnected ? `Connected: ${connectedName}` : "Not Connected"}
      </Text>

      {!isConnected && (
        <View style={styles.modeRow}>
          {SOURCE_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeChip,
                sourceMode === mode.key && styles.modeChipActive,
              ]}
              onPress={() => setSourceMode(mode.key)}
              disabled={isScanning || isConnecting}
            >
              <Text
                style={[
                  styles.modeChipText,
                  sourceMode === mode.key && styles.modeChipTextActive,
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.button, styles.scanButton, isScanning && styles.buttonDisabled]}
          onPress={handleScan}
          disabled={isScanning || isConnected || isConnecting}
        >
          {isScanning ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Scan OBD Devices</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton, !isConnected && styles.buttonDisabled]}
          onPress={disconnect}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {devices.length > 0 && !isConnected && (
        <View style={styles.devicesPanel}>
          <Text style={styles.panelTitle}>Nearby OBD Devices</Text>
          {devices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceRow}
              onPress={() => connectToELM327(device)}
              disabled={isConnecting}
            >
              <View>
                <Text style={styles.deviceName}>{device.name || device.localName || "Unnamed device"}</Text>
                <Text style={styles.deviceMeta}>{device.id}</Text>
              </View>
              <Text style={styles.connectLabel}>{isConnecting ? "Connecting..." : "Connect"}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.cards}>
        <Card label="RPM" value={Math.round(liveData.rpm)} />
        <Card label="Speed" value={`${Math.round(liveData.speed)} km/h`} />
        <Card label="Coolant" value={`${Math.round(liveData.engineTemp)}°C`} />
        <Card label="Intake" value={`${Math.round(liveData.intakeTemp)}°C`} />
        <Card label="Throttle" value={`${Math.round(liveData.throttle)}%`} />
        <Card label="Engine Load" value={`${Math.round(liveData.engineLoad)}%`} />
        <Card label="MAP" value={`${Math.round(liveData.map)} kPa`} />
        <Card label="Voltage" value={`${liveData.voltage.toFixed(2)} V`} />
      </View>
    </ScrollView>
  );
}

function Card({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#0F172A", flex: 1 },
  header: { fontSize: 24, fontWeight: "700", color: "white" },
  subheader: { color: "#9CA3AF", marginBottom: 20 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#111827",
  },
  modeChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  modeChipText: {
    color: "#CBD5E1",
    fontWeight: "600",
    fontSize: 13,
  },
  modeChipTextActive: {
    color: "#FFFFFF",
  },
  devicesPanel: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  panelTitle: {
    color: "#E2E8F0",
    fontWeight: "700",
    marginBottom: 10,
  },
  deviceRow: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    color: "#F8FAFC",
    fontWeight: "600",
  },
  deviceMeta: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  connectLabel: {
    color: "#60A5FA",
    fontWeight: "700",
  },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  card: {
    width: "47%",
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 10,
  },
  cardLabel: { color: "#CBD5E1", fontSize: 14 },
  cardValue: { color: "white", fontSize: 22, fontWeight: "700", marginTop: 4 },
  button: {
    marginTop: 24,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  scanButton: { backgroundColor: "#2563EB" },
  disconnectButton: { backgroundColor: "#b91c1c" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});