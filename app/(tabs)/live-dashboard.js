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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";

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
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connectedName, setConnectedName] = useState("");
  const [sourceMode, setSourceMode] = useState("auto");

  const [liveData, setLiveData] = useState(INITIAL_LIVE_DATA);
  const hasLiveTelemetry = Object.values(liveData).some((v) => Number(v) > 0);

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

  const GaugeCard = ({ label, value, unit, icon }) => (
    <View style={styles.gaugeCard}>
      <View style={styles.gaugeHeader}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.accent} />
        <Text style={styles.gaugeLabel}>{label}</Text>
      </View>
      <Text style={styles.gaugeValue}>{value}</Text>
      <Text style={styles.gaugeUnit}>{unit}</Text>
    </View>
  );

  const Card = ({ icon, label, value }) => (
    <View style={styles.card}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.accent} />
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View>
          <Text style={styles.header}>Live Telemetry</Text>
          <Text style={styles.subheader}>Realtime ECU stream and sensor cockpit</Text>
        </View>
        <View style={[styles.statusPill, isConnected ? styles.statusConnected : styles.statusDisconnected]}>
          <Text style={[styles.statusPillText, isConnected ? styles.statusConnectedText : styles.statusDisconnectedText]}>
            {isConnected ? "ONLINE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      <View style={styles.connectionStrip}>
        <MaterialCommunityIcons name={isConnected ? "bluetooth-connect" : "bluetooth-off"} size={16} color={colors.accent} />
        <Text style={styles.connectionText} numberOfLines={1}>
          {isConnected ? connectedName : "No device connected"}
        </Text>
      </View>

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
          style={[
            styles.button,
            styles.scanButton,
            (isScanning || hasLiveTelemetry) && styles.buttonDisabled,
          ]}
          onPress={handleScan}
          disabled={isScanning || isConnected || isConnecting || hasLiveTelemetry}
        >
          {isScanning ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <MaterialCommunityIcons name="radar" size={16} color={colors.background} />
              <Text style={styles.buttonText}>Scan</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton, !isConnected && styles.buttonDisabled]}
          onPress={disconnect}
          disabled={!isConnected}
        >
          <MaterialCommunityIcons name="power" size={16} color="#F8FAFC" />
          <Text style={styles.buttonTextDanger}>Disconnect</Text>
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
              <View style={styles.connectBadge}>
                <Text style={styles.connectLabel}>{isConnecting ? "CONNECTING" : "CONNECT"}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.primaryGaugesRow}>
        <GaugeCard
          label="RPM"
          value={Math.round(liveData.rpm)}
          unit="rev/min"
          icon="engine-outline"
        />
        <GaugeCard
          label="Speed"
          value={Math.round(liveData.speed)}
          unit="km/h"
          icon="speedometer"
        />
      </View>

      <View style={styles.cards}>
        <Card icon="coolant-temperature" label="Coolant" value={`${Math.round(liveData.engineTemp)} C`} />
        <Card icon="thermometer" label="Intake" value={`${Math.round(liveData.intakeTemp)} C`} />
        <Card icon="tune" label="Throttle" value={`${Math.round(liveData.throttle)}%`} />
        <Card icon="car-shift-pattern" label="Engine Load" value={`${Math.round(liveData.engineLoad)}%`} />
        <Card icon="gauge" label="MAP" value={`${Math.round(liveData.map)} kPa`} />
        <Card icon="flash-outline" label="Voltage" value={`${liveData.voltage.toFixed(2)} V`} />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.background, flex: 1 },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  subheader: { color: colors.muted, marginTop: 4, fontSize: 12, letterSpacing: 0.3 },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusConnected: {
    backgroundColor: "#182119",
    borderColor: "#2A3A2C",
  },
  statusDisconnected: {
    backgroundColor: "#1E1A1A",
    borderColor: "#3A2A2A",
  },
  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  statusConnectedText: {
    color: "#86EFAC",
  },
  statusDisconnectedText: {
    color: "#FCA5A5",
  },
  connectionStrip: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectionText: {
    color: colors.accent,
    fontSize: 12,
    flex: 1,
  },
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
    borderColor: colors.border,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.panel,
  },
  modeChipActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  modeChipText: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: 13,
  },
  modeChipTextActive: {
    color: colors.text,
  },
  devicesPanel: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelTitle: {
    color: colors.text,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  deviceRow: {
    backgroundColor: colors.panel,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    color: colors.text,
    fontWeight: "600",
  },
  deviceMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  connectBadge: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectLabel: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  primaryGaugesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  gaugeCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  gaugeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gaugeLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gaugeValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 8,
  },
  gaugeUnit: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  card: {
    width: "47%",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { color: colors.muted, fontSize: 12, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  cardValue: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 4 },
  button: {
    marginTop: 6,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 0,
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  scanButton: { backgroundColor: colors.accent },
  disconnectButton: { backgroundColor: "#DC2626" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.onAccent, fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  buttonTextDanger: { color: "#F8FAFC", fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});
