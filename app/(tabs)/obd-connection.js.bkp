import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { BleManager } from "react-native-ble-plx";

export default function BleScanner() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const manager = useRef(new BleManager()).current;
  const disconnectSubscription = useRef(null);
  const connectionCancelled = useRef(false);

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
      alert("Permissions denied! Check app settings.");
      return;
    }

    console.log("âœ“ Starting BLE scan...");
    setDevices([]);
    setScanning(true);

    manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error("âŒ Scan error:", error);
          setScanning(false);
          return;
        }

        if (device) {
          setDevices((prevDevices) => {
            const exists = prevDevices.some((d) => d.id === device.id);

            if (!exists) {
              console.log(
                "ðŸ“± New device:",
                device.name || "Unknown",
                device.id,
              );
            }

            const newDevices = [...prevDevices, device];
            const uniqueDevices = Array.from(
              new Map(newDevices.map((d) => [d.id, d])).values(),
            );
            return uniqueDevices;
          });
        }
      },
    );

    setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
      console.log("â¹ Scan stopped");
    }, 15000);
  };

  const stopScan = () => {
    manager.stopDeviceScan();
    setScanning(false);
  };

  const connectToDevice = async (device, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 15000;

    connectionCancelled.current = false;
    setConnectingId(device.id);
    console.log(
      `ðŸ”„ Attempt ${retryCount + 1}/${MAX_RETRIES + 1}: ${
        device.name || "Unknown"
      }`,
    );

    try {
      manager.stopDeviceScan();
      setScanning(false);

      try {
        await manager.cancelDeviceConnection(device.id);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {}

      if (connectionCancelled.current) {
        console.log("âš ï¸ Cancelled before connection");
        return;
      }

      console.log("â³ Connecting...");
      const connectedDev = await manager.connectToDevice(device.id, {
        autoConnect: false,
        timeout: TIMEOUT_MS,
      });

      if (connectionCancelled.current) {
        console.log("âš ï¸ Cancelled after connection, cleaning up...");
        await manager.cancelDeviceConnection(device.id);
        return;
      }

      console.log("âœ… Connected! Discovering services...");
      await connectedDev.discoverAllServicesAndCharacteristics();

      if (connectionCancelled.current) {
        console.log("âš ï¸ Cancelled after discovery, cleaning up...");
        await manager.cancelDeviceConnection(device.id);
        return;
      }

      const updatedName =
        connectedDev.name || connectedDev.localName || "Unknown";

      setConnectedDevice({
        id: connectedDev.id,
        name: updatedName,
      });

      console.log("âœ… Fully connected:", updatedName);
      alert(`âœ“ Connected to ${updatedName}`);

      disconnectSubscription.current = manager.onDeviceDisconnected(
        connectedDev.id,
        (error, disconnectedDevice) => {
          console.log("ðŸ”Œ Device disconnected");
          setConnectedDevice(null);
          alert("Device disconnected");

          if (disconnectSubscription.current) {
            disconnectSubscription.current.remove();
            disconnectSubscription.current = null;
          }
        },
      );
    } catch (error) {
      if (connectionCancelled.current) {
        console.log("âš ï¸ Cancelled by user");
        return;
      }

      console.error(`âŒ Attempt ${retryCount + 1} failed:`, error.message);

      if (retryCount < MAX_RETRIES && !connectionCancelled.current) {
        console.log(`â³ Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (!connectionCancelled.current) {
          return connectToDevice(device, retryCount + 1);
        }
      } else if (!connectionCancelled.current) {
        alert(
          `Connection failed after ${MAX_RETRIES + 1} attempts.\n\n${
            error.message
          }`,
        );
      }
    } finally {
      setConnectingId(null);
      connectionCancelled.current = false;
    }
  };

  const cancelConnection = async () => {
    if (connectingId) {
      console.log("ðŸ›‘ User cancelled connection");
      connectionCancelled.current = true;

      try {
        await manager.cancelDeviceConnection(connectingId);
        console.log("âœ“ Cancelled successfully");
      } catch (error) {
        console.log("Cancellation error:", error.message);
      }

      setConnectingId(null);
      alert("Connection cancelled");
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        if (disconnectSubscription.current) {
          disconnectSubscription.current.remove();
          disconnectSubscription.current = null;
        }

        await manager.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
        console.log("âœ… Disconnected");
        alert("Disconnected successfully");
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (disconnectSubscription.current) {
        disconnectSubscription.current.remove();
      }
      manager.destroy();
    };
  }, []);

  return (
    <View style={styles.container}>
      {connectedDevice && (
        <View style={styles.connectedBanner}>
          <Text style={styles.connectedText}>
            âœ“ Connected: {connectedDevice.name}
          </Text>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={disconnectDevice}
          >
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}

      <Button
        title={scanning ? "Stop Scan" : "Start Scan"}
        onPress={scanning ? stopScan : startScan}
        disabled={!!connectedDevice}
      />

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.device}>
            <Text style={styles.name}>
              {item.name ?? item.localName ?? "Unknown"}
            </Text>
            <Text style={styles.id}>{item.id}</Text>
            <Text style={{ fontSize: 12, color: "#444" }}>
              RSSI: {item.rssi ?? "N/A"}
            </Text>

            {connectingId === item.id ? (
              <TouchableOpacity
                style={[styles.connectButton, styles.cancelButton]}
                onPress={cancelConnection}
              >
                <ActivityIndicator
                  color="#fff"
                  size="small"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.connectText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => connectToDevice(item)}
                disabled={!!connectedDevice}
              >
                <Text style={styles.connectText}>
                  {connectedDevice?.id === item.id ? "Connected" : "Connect"}
                </Text>
              </TouchableOpacity>
            )}
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
  connectedBanner: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  connectedText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  disconnectButton: {
    backgroundColor: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  disconnectText: { color: "#4CAF50", fontWeight: "600" },
  device: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    flexDirection: "column",
  },
  name: { fontSize: 16, fontWeight: "bold" },
  id: { fontSize: 12, color: "#555", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 20, color: "#888" },
  connectButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: "flex-start",
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  connectText: { color: "#fff", fontWeight: "600" },
});
