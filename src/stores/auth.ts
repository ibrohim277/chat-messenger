import { create } from "zustand";
import { api, tokenStorage } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (res: AuthResponse) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    set({
      user: tokenStorage.getUser(),
      accessToken: tokenStorage.getAccess(),
      refreshToken: tokenStorage.getRefresh(),
      hydrated: true,
    });
  },
  setAuth: (res) => {
    tokenStorage.set(res.accessToken, res.refreshToken, res.user);
    set({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken, hydrated: true });
  },
  login: async (email, password) => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    get().setAuth(data);
  },
  register: async (payload) => {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    get().setAuth(data);
  },
  logout: async () => {
    const refreshToken = get().refreshToken;
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } catch {
      /* ignore */
    }
    tokenStorage.clear();
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
