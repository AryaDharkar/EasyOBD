import { Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";

export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/overview" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

