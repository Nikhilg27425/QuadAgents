import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.krishisahaayak.example.com";

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from sessionStorage
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem("ks_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 redirect & global errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) { 
        sessionStorage.removeItem("ks_token");
         sessionStorage.removeItem("ks_user");
        window.location.href = "/login"; }
    return Promise.reject(error);
  }
);

export default apiClient;
