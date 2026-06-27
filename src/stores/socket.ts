import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { WS_URL } from "@/lib/api";

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: (token: string) => Socket;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  connect: (token: string) => {
    const existing = get().socket;
    if (existing && existing.connected) return existing;
    if (existing) existing.disconnect();
    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
    });
    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));
    set({ socket });
    return socket;
  },
  disconnect: () => {
    const s = get().socket;
    if (s) s.disconnect();
    set({ socket: null, connected: false });
  },
}));
