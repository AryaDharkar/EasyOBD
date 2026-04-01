import { Stack } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator, Text, TextInput } from "react-native";
import { useFonts } from "expo-font";
import {
  Orbitron_400Regular,
  Orbitron_600SemiBold,
} from "@expo-google-fonts/orbitron";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

const APP_FONT_REGULAR = "Orbitron_400Regular";
const APP_FONT_EMPHASIS = "Orbitron_600SemiBold";

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
  const [fontsLoaded] = useFonts({
    Orbitron_400Regular,
    Orbitron_600SemiBold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    if (!Text.defaultProps) Text.defaultProps = {};
    Text.defaultProps.style = [
      Text.defaultProps.style,
      { fontFamily: APP_FONT_EMPHASIS },
    ];

    if (!TextInput.defaultProps) TextInput.defaultProps = {};
    TextInput.defaultProps.style = [
      TextInput.defaultProps.style,
      { fontFamily: APP_FONT_REGULAR },
    ];
  }, [fontsLoaded]);

  if (!fontsLoaded || !isThemeReady) {
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
