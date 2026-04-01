import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "appThemeModeV2";

const palette = {
  dark: {
    background: "#0f1116",
    surface: "#141922",
    panel: "#10151D",
    border: "#20242D",
    text: "#E5E7EB",
    muted: "#8FA1BD",
    accent: "#60A5FA",
    onAccent: "#0B1220",
    inputPlaceholder: "#9CA3AF",
    warningSurface: "#2F2313",
    warningBorder: "#F59E0B",
    warningText: "#FCD34D",
    warningBody: "#FDE68A",
    chipBg: "#1E293B",
    chipBorder: "#334155",
    chipText: "#BFDBFE",
  },
  light: {
    background: "#F3F5F8",
    surface: "#FFFFFF",
    panel: "#EEF1F5",
    border: "#D4DAE2",
    text: "#1F2937",
    muted: "#556070",
    accent: "#2563EB",
    onAccent: "#F8FAFC",
    inputPlaceholder: "#8A94A4",
    warningSurface: "#FFFBEB",
    warningBorder: "#F59E0B",
    warningText: "#B45309",
    warningBody: "#92400E",
    chipBg: "#DBEAFE",
    chipBorder: "#93C5FD",
    chipText: "#1E3A8A",
  },
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("light");
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
          setMode(saved);
        }
      } catch (error) {
        console.log("Theme load failed:", error?.message || String(error));
      } finally {
        setIsThemeReady(true);
      }
    };

    loadTheme();
  }, []);

  const setTheme = async (nextMode) => {
    if (nextMode !== "light" && nextMode !== "dark") return;
    setMode(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch (error) {
      console.log("Theme save failed:", error?.message || String(error));
    }
  };

  const toggleTheme = async () => {
    await setTheme(mode === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      colors: palette[mode],
      isThemeReady,
      setTheme,
      toggleTheme,
    }),
    [mode, isThemeReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
