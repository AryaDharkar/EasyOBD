import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          // Force navigation to login
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || "User"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>
      </View>

      {/* Settings Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>👤</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>Edit Profile</Text>
            <Text style={styles.optionSubtext}>Update your information</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>🔔</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>Notifications</Text>
            <Text style={styles.optionSubtext}>Manage alerts</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>📏</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>Units</Text>
            <Text style={styles.optionSubtext}>km/h, °C</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>🌙</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>Theme</Text>
            <Text style={styles.optionSubtext}>Light mode</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>ℹ️</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>About EasyOBD</Text>
            <Text style={styles.optionSubtext}>Version 1.0.0</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>📄</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>Privacy Policy</Text>
            <Text style={styles.optionSubtext}>How we handle your data</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option}>
          <Text style={styles.optionIcon}>📧</Text>
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>Support</Text>
            <Text style={styles.optionSubtext}>Get help</Text>
          </View>
          <Text style={styles.optionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for vehicle owners</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  profileSection: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 13,
    color: "#999",
  },
  optionArrow: {
    fontSize: 24,
    color: "#ccc",
    fontWeight: "300",
  },
  logoutButton: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF4444",
  },
  footer: {
    paddingVertical: 30,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
