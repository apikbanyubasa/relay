import { create } from "zustand";
import { apiClient } from "../lib/api-client";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user: User, token?: string) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("relay_auth_token", token);
      }
      localStorage.setItem("relay_auth_user", JSON.stringify(user));
    }
    set({ user, token: token || null, isLoading: false });
  },

  logout: async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("relay_auth_token");
        localStorage.removeItem("relay_auth_user");
      }
      set({ user: null, token: null, isLoading: false });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },

  initialize: async () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    const savedToken = localStorage.getItem("relay_auth_token");
    const savedUserStr = localStorage.getItem("relay_auth_user");

    if (!savedToken) {
      set({ user: null, token: null, isLoading: false });
      return;
    }

    // Optimistically set cached user so UI doesn't flicker or bounce back to /login
    if (savedUserStr) {
      try {
        const cachedUser = JSON.parse(savedUserStr);
        set({ user: cachedUser, token: savedToken, isLoading: false });
      } catch {
        // ignore parse error
      }
    }

    try {
      // Validate session via Bearer token
      const res = await apiClient.get("/api/auth/me");
      if (res.data?.success && res.data?.data) {
        set({ user: res.data.data, token: savedToken, isLoading: false });
        localStorage.setItem("relay_auth_user", JSON.stringify(res.data.data));
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("relay_auth_token");
        localStorage.removeItem("relay_auth_user");
      }
      set({ user: null, token: null, isLoading: false });
    } catch (_err) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("relay_auth_token");
        localStorage.removeItem("relay_auth_user");
      }
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
