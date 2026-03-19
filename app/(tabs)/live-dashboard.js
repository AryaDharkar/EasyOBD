import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import elm from "../services/elm327";

const PID_STATS = [
  {
    pid: "01 0C",
    key: "rpm",
    label: "RPM",
    format: (v) => Math.round(v),
  },
  {
    pid: "01 0D",
    key: "speed",
    label: "Speed",
    format: (v) => `${Math.round(v)} km/h`,
  },
  {
    pid: "01 05",
    key: "engineTemp",
    label: "Coolant",
    format: (v) => `${Math.round(v)}°C`,
  },
  {
    pid: "01 0F",
    key: "intakeTemp",
    label: "Intake Air",
    format: (v) => `${Math.round(v)}°C`,
  },
  {
    pid: "01 10",
    key: "maf",
    label: "MAF",
    format: (v) => `${v.toFixed(1)} g/s`,
  },
  {
    pid: "01 11",
    key: "throttle",
    label: "Throttle",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    pid: "01 04",
    key: "engineLoad",
    label: "Engine Load",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    pid: "01 2F",
    key: "fuelLevel",
    label: "Fuel Level",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    // If your vehicle reports fuel level on a different PID, change this value.
    pid: "01 2F",
    key: "fuelLevelAlt",
    label: "Fuel Level (alt)",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    pid: "01 46",
    key: "ambientTemp",
    label: "Ambient",
    format: (v) => `${Math.round(v)}°C`,
  },
];

const INITIAL_LIVE_DATA = PID_STATS.reduce((acc, stat) => {
  acc[stat.key] = 0;
  return acc;
}, {});

export default function LiveDashboardScreen() {
  const [isConnected, setIsConnected] = useState(false);

  const [liveData, setLiveData] = useState(INITIAL_LIVE_DATA);

  const intervalRef = useRef(null);
  const pidIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      elm.close();
    };
  }, []);

  const connectToELM327 = async () => {
    try {
      Alert.alert("Connecting…", "Connecting to ELM327...");
      await elm.connect("1C:A1:35:69:8D:C5");

      elm.onRaw = handleRaw;

      setIsConnected(true);
      startPolling();

      Alert.alert("Connected", "OBD-II live streaming started.");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const startPolling = () => {
    const pids = ["01 0C", "01 0D", "01 05", "01 04", "01 11", "01 2F"];
    pidIndexRef.current = 0;

    intervalRef.current = setInterval(() => {
      elm.send(pids[pidIndexRef.current]);
      pidIndexRef.current = (pidIndexRef.current + 1) % pids.length;
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
      case "11":
        return { ...prev, throttle: value };
      case "04":
        return { ...prev, engineLoad: value };
      case "2F":
        return { ...prev, fuelLevel: value };
      default:
        return prev;
    }
  });
};

const handleRaw = (raw) => {
  console.log("RAW:", raw);

  const lines = raw
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("41"));

  for (const line of lines) {
    const parsed = elm.parsePID(line);
    if (parsed) update(parsed.pid, parsed.value);
  }
};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Live Dashboard</Text>
      <Text style={styles.subheader}>
        {isConnected ? "Connected" : "Not Connected"}
      </Text>

      <View style={styles.cards}>
        <Card label="RPM" value={Math.round(liveData.rpm)} />
        <Card label="Speed" value={`${Math.round(liveData.speed)} km/h`} />
        <Card label="Coolant" value={`${Math.round(liveData.engineTemp)}°C`} />
        <Card label="Throttle" value={`${Math.round(liveData.throttle)}%`} />
        <Card label="Engine Load" value={`${Math.round(liveData.engineLoad)}%`} />
        <Card label="Fuel Level" value={`${Math.round(liveData.fuelLevel)}%`} />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={connectToELM327}
        disabled={isConnected}
      >
        <Text style={styles.buttonText}>
          {isConnected ? "Connected" : "Connect to OBD-II"}
        </Text>
      </TouchableOpacity>
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
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
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
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});