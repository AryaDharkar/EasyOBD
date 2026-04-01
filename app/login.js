import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        // Navigation will be handled by the auth state change
        router.replace("/(tabs)/overview");
      } else {
        Alert.alert("Login Failed", result.message || "Invalid credentials");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>EOBD</Text>
          <Text style={styles.title}>EasyOBD</Text>
          <Text style={styles.subtitle}>Portable vehicle telemetry and diagnostics</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              disabled={isLoading}
            >
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    fontSize: 42,
    letterSpacing: 4,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.accent,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.muted,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 0,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: colors.onAccent,
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: colors.muted,
  },
  linkText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
});


