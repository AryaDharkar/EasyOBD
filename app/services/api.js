import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ CHANGE THIS TO YOUR BACKEND URL
const API_BASE_URL = "http://192.168.0.103:3000/api/v1";

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

const apiRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token && !options.skipAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

const api = {
  // ==================== AUTH ====================
  register: async (name, email, password) => {
    const data = await apiRequest("/users/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
      skipAuth: true,
    });

    if (data.token) {
      await AsyncStorage.setItem("authToken", data.token);
    }
    if (data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    }

    return { success: true, data: data.user };
  },

  login: async (email, password) => {
    const data = await apiRequest("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    if (data.token) {
      await AsyncStorage.setItem("authToken", data.token);
    }
    if (data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    }

    return { success: true, data: data.user, token: data.token };
  },

  logout: async () => {
    try {
      await apiRequest("/users/logout", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("user");
    }
  },

  getUserDetails: async () => {
    const data = await apiRequest("/users/");
    return { success: true, data: data.user };
  },

  // ==================== VEHICLES ====================
  getVehicles: async () => {
    return await apiRequest("/vehicles");
  },

  getVehicle: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}`);
  },

  addVehicle: async (vehicleData) => {
    return await apiRequest("/vehicles", {
      method: "POST",
      body: JSON.stringify(vehicleData),
    });
  },

  updateVehicle: async (vehicleId, vehicleData) => {
    return await apiRequest(`/vehicles/${vehicleId}`, {
      method: "PUT",
      body: JSON.stringify(vehicleData),
    });
  },

  deleteVehicle: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}`, {
      method: "DELETE",
    });
  },

  // ==================== OBD DATA ====================
  // Upload OBD records (bulk)
  uploadOBDData: async (vehicleId, obdRecords) => {
    return await apiRequest(`/vehicles/${vehicleId}/obd`, {
      method: "POST",
      body: JSON.stringify(obdRecords),
    });
  },

  getOBDRecords: async (vehicleId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(
      `/vehicles/${vehicleId}/obd${query ? "?" + query : ""}`,
    );
  },

  deleteOldOBDRecords: async (vehicleId, beforeDate) => {
    return await apiRequest(`/vehicles/${vehicleId}/obd`, {
      method: "DELETE",
      body: JSON.stringify({ beforeDate }),
    });
  },

  // ==================== DIAGNOSTICS ====================
  // Get diagnostics (ML reports from cron job)
  getDiagnostics: async (vehicleId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(
      `/vehicles/${vehicleId}/diagnostics${query ? "?" + query : ""}`,
    );
  },

  // Get latest diagnostic report
  getLatestDiagnostic: async (vehicleId) => {
    const response = await apiRequest(
      `/vehicles/${vehicleId}/diagnostics?limit=1`,
    );
    return response?.data?.[0] || null;
  },
};

export default api;
