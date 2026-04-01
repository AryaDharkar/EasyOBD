import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = createStyles(colors);

  const sections = [
    {
      title: "Account",
      items: [
        {
          key: "edit-profile",
          icon: "account-outline",
          label: "Edit Profile",
          description: "Update your information",
        },
        {
          key: "notifications",
          icon: "bell-outline",
          label: "Notifications",
          description: "Manage alerts",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          key: "units",
          icon: "ruler",
          label: "Units",
          description: "km/h, C",
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          key: "about",
          icon: "information-outline",
          label: "About EasyOBD",
          description: "Version 1.0.0",
        },
        {
          key: "privacy",
          icon: "file-document-outline",
          label: "Privacy Policy",
          description: "How we handle your data",
        },
        {
          key: "support",
          icon: "lifebuoy",
          label: "Support",
          description: "Get help",
        },
      ],
    },
  ];

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

  const handleComingSoon = (label) => {
    Alert.alert("Coming Soon", `${label} will be available in an upcoming update.`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Tune your telemetry experience</Text>
      </View>

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
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={[styles.option, styles.optionLast]}>
          <MaterialCommunityIcons
            name="theme-light-dark"
            size={22}
            color={colors.accent}
            style={styles.optionIcon}
          />
          <View style={styles.optionContent}>
            <Text style={styles.optionText}>Theme</Text>
            <Text style={styles.optionSubtext}>{isDark ? "Dark mode" : "Light mode"}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={isDark ? colors.surface : colors.text}
          />
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          {section.items.map((item, index) => {
            const isLast = index === section.items.length - 1;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.option, isLast && styles.optionLast]}
                activeOpacity={0.85}
                onPress={() => handleComingSoon(item.label)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={colors.accent}
                  style={styles.optionIcon}
                />
                <View style={styles.optionContent}>
                  <Text style={styles.optionText}>{item.label}</Text>
                  <Text style={styles.optionSubtext}>{item.description}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={colors.accent}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Built for high-performance vehicle owners</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  profileSection: {
    backgroundColor: colors.surface,
    alignItems: "center",
    paddingVertical: 28,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 0,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.surface,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.muted,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionIcon: {
    width: 26,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 13,
    color: colors.muted,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 20,
    padding: 16,
    borderRadius: 0,
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
    paddingVertical: 10,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
  },
});


