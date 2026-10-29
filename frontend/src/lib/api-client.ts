import axios, { type AxiosError } from "axios";
import type { ApiResponse } from "../types";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BE_URL || "http://localhost:4000",
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("relay_auth_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    // If 401 unauthorized and not on login page, clear credentials & redirect
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("relay_auth_token");
      localStorage.removeItem("relay_auth_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
