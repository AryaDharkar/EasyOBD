import { Tabs } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

export default function TabsLayout() {
  const { isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <Tabs
        initialRouteName="overview"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: 10,
            paddingTop: 8,
            height: 68,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="speedometer" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="live-dashboard"
          options={{
            title: "Live Data",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

