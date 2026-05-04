import { Stack } from "expo-router";
import { View, ActivityIndicator, Text, TextInput } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

const APP_FONT_FAMILY = "Inter";

if (!Text.defaultProps) Text.defaultProps = {};
Text.defaultProps.style = { fontFamily: APP_FONT_FAMILY };

if (!TextInput.defaultProps) TextInput.defaultProps = {};
TextInput.defaultProps.style = { fontFamily: APP_FONT_FAMILY };

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootLayoutContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const { isThemeReady, colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!isThemeReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="device-setup" options={{ headerShown: false }} />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.background,
              paddingTop: 0,
              paddingBottom: 0,
            },
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
