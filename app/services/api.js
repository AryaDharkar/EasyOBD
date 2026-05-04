import AsyncStorage from "@react-native-async-storage/async-storage";

// Change this to your backend URL
const API_BASE_URL = "http://192.168.0.72:3000/api/v1";

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

  const parseResponseBody = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();

    if (!rawBody) {
      return null;
    }

    if (contentType.includes("application/json")) {
      return JSON.parse(rawBody);
    }

    const trimmedBody = rawBody.trim();
    if (trimmedBody.startsWith("{")) {
      return JSON.parse(trimmedBody);
    }

    if (trimmedBody.startsWith("<")) {
      throw new Error(
        `Unexpected HTML response from ${endpoint} (status ${response.status})`,
      );
    }

    return trimmedBody;
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await parseResponseBody(response);

    if (!response.ok) {
      const message =
        (data && typeof data === "object" && data.message) ||
        (typeof data === "string" && data.length > 0
          ? data.slice(0, 200)
          : "Something went wrong");
      throw new Error(message);
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
  // Get diagnostics (ML reports)
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

  // Get data collection progress
  getCollectionProgress: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}/diagnostics/progress`);
  },

  // Manually trigger report generation
  generateReport: async (vehicleId, espAnomalyFlag = false, seedCsv = "") => {
    return await apiRequest(`/vehicles/${vehicleId}/diagnostics/generate`, {
      method: "POST",
      body: JSON.stringify({
        espAnomalyFlag: espAnomalyFlag,
        seedCsv,
      })
    });
  },

  // ==================== BASELINE MODEL ====================
  // Get baseline model for ESP32
  getBaselineModel: async (vehicleId) => {
    return await apiRequest(`/vehicles/${vehicleId}/baseline`);
  },

  // Get model chunk for BLE transfer
  getModelChunk: async (vehicleId, chunkIndex) => {
    return await apiRequest(`/vehicles/${vehicleId}/baseline/chunk/${chunkIndex}`);
  },

  // Mark model as deployed to ESP
  markModelDeployed: async (vehicleId, modelId) => {
    return await apiRequest(`/vehicles/${vehicleId}/baseline/${modelId}/deployed`, {
      method: "POST"
    });
  },
};

export default api;
