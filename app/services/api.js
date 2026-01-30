import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ CHANGE THIS TO YOUR BACKEND URL
// For local development: http://YOUR_COMPUTER_IP:3000
// For production: https://your-deployed-backend.com
const API_BASE_URL = "http://192.168.0.100:3000/api/v1";

// Helper to get auth token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add auth token if available
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

// API methods
const api = {
  // Auth endpoints
  register: async (name, email, password) => {
    const data = await apiRequest("/users/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
      skipAuth: true,
    });

    // Save token
    if (data.success && data.data.token) {
      await AsyncStorage.setItem("authToken", data.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.data));
    }

    return data;
  },

  login: async (email, password) => {
    const data = await apiRequest("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    // Save token
    if (data.success && data.data.token) {
      await AsyncStorage.setItem("authToken", data.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.data));
    }

    return data;
  },

  logout: async () => {
    try {
      await apiRequest("/users/logout", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("user");
    }
  },

  getUserDetails: async () => {
    return await apiRequest("/users/");
  },

  // Vehicle endpoints
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

  // OBD Data endpoints
  uploadOBDData: async (vehicleId, obdRecords) => {
    return await apiRequest(`/vehicles/${vehicleId}/obd`, {
      method: "POST",
      body: JSON.stringify(obdRecords),
    });
  },

  getOBDRecords: async (vehicleId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/vehicles/${vehicleId}/obd?${query}`);
  },

  getOBDStats: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}/obd/stats`);
  },

  // Batch endpoints
  getBatches: async (vehicleId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/vehicles/${vehicleId}/batches?${query}`);
  },

  getBatch: async (vehicleId, batchId) => {
    return await apiRequest(`/vehicles/${vehicleId}/batches/${batchId}`);
  },

  createBatch: async (vehicleId, batchData) => {
    return await apiRequest(`/vehicles/${vehicleId}/batches`, {
      method: "POST",
      body: JSON.stringify(batchData),
    });
  },

  // ML Reports endpoints
  getMLReports: async (vehicleId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/vehicles/${vehicleId}/ml-reports?${query}`);
  },

  getLatestMLReport: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}/ml-reports/latest`);
  },

  getHealthTrend: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}/ml-reports/trend`);
  },

  // Diagnostics endpoints
  getDiagnostics: async (vehicleId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/vehicles/${vehicleId}/diagnostics?${query}`);
  },

  getLatestDiagnostic: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}/diagnostics/latest`);
  },
};

export default api;
