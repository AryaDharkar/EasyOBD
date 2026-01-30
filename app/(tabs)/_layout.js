import { Tabs, Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#1E40AF",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏥</Text>,
        }}
      />
      <Tabs.Screen
        name="live-dashboard"
        options={{
          title: "Live Data",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="obd-connection"
        options={{
          title: "OBD Connect",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🔌</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
  },
});
