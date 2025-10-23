import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from "react-native";
import { BleManager } from "react-native-ble-plx";

export default function BleScanner() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const manager = useRef(new BleManager()).current;

  // Request permissions for Android
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
      console.warn("Permissions denied");
      return;
    }

    setDevices([]);
    setScanning(true);

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error:", error);
        setScanning(false);
        return;
      }

      if (device) {
        setDevices((prevDevices) => {
          // Keep unique devices only
          const newDevices = [...prevDevices, device];
          const uniqueDevices = Array.from(
            new Map(newDevices.map((d) => [d.id, d])).values()
          );
          return uniqueDevices;
        });
      }
    });
  };

  const stopScan = () => {
    manager.stopDeviceScan();
    setScanning(false);
  };

  useEffect(() => {
    // Cleanup BLE manager on unmount
    return () => {
      manager.destroy();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Button
        title={scanning ? "Stop Scan" : "Start Scan"}
        onPress={scanning ? stopScan : startScan}
      />
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.device}>
            <Text style={styles.name}>{item.name ?? "Unknown"}</Text>
            <Text style={styles.id}>{item.id}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No devices found yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  device: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  name: { fontSize: 16, fontWeight: "bold" },
  id: { fontSize: 12, color: "#555" },
  empty: { textAlign: "center", marginTop: 20, color: "#888" },
});
