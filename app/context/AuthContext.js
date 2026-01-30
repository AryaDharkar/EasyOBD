import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const userData = await AsyncStorage.getItem("user");

      if (token && userData) {
        // Verify token is still valid by making a test API call
        try {
          const response = await api.getUserDetails();
          if (response.success) {
            setUser(response.data);
            setIsAuthenticated(true);
          } else {
            // Token invalid, clear storage
            await clearAuth();
          }
        } catch (error) {
          // Token expired or invalid
          console.log("Token invalid:", error);
          await clearAuth();
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("selectedVehicleId");
    setUser(null);
    setIsAuthenticated(false);
  };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);

      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
        return { success: true };
      }

      return { success: false, message: response.message || "Login failed" };
    } catch (error) {
      return { success: false, message: error.message || "Login failed" };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.register(name, email, password);

      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
        return { success: true };
      }

      return {
        success: false,
        message: response.message || "Registration failed",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await clearAuth();
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.getUserDetails();
      if (response.success) {
        setUser(response.data);
        await AsyncStorage.setItem("user", JSON.stringify(response.data));
      }
    } catch (error) {
      console.error("Refresh user error:", error);
      // If refresh fails, token might be expired
      await clearAuth();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
