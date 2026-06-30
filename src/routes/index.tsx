import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Search, MessageCircle, Plus, ChevronLeft } from "lucide-react";
import { api, tokenStorage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useSocketStore } from "@/stores/socket";
import type { Message, Room, User } from "@/lib/types";
import { Avatar } from "@/components/chat/Avatar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { errorMessage, formatTime } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Chat" }] }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const socket = useSocketStore((s) => s.socket);
  const connected = useSocketStore((s) => s.connected);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydrated && !tokenStorage.getAccess()) {
      navigate({ to: "/login" });
    }
  }, [navigate, hydrated]);

  const [query, setQuery] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => (await api.get<Room[]>("/rooms")).data,
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
    enabled: !!user && query.trim().length > 0,
    staleTime: 30_000,
  });

  const filteredUsers = useMemo(() => {
    if (!query.trim() || !usersQuery.data) return [];
    const q = query.toLowerCase();
    return usersQuery.data
      .filter(
        (u) =>
          u.id !== user?.id &&
          (u.username.toLowerCase().includes(q) ||
            (u.displayName ?? "").toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [query, usersQuery.data, user?.id]);

  const openPrivate = async (targetUserId: string) => {
    try {
      const { data } = await api.post<Room>(`/rooms/private/${targetUserId}`);
      setActiveRoomId(data.id);
      setQuery("");
      qc.invalidateQueries({ queryKey: ["rooms"] });
    } catch (e) {
      toast.error(errorMessage(e, "Suhbat ochilmadi"));
    }
  };

  // Global socket listeners
  useEffect(() => {
    if (!socket || !user) return;

    const onAnyMessage = (m: Message) => {
      qc.setQueryData<Room[]>(["rooms"], (prev) => {
        if (!prev) return prev;
        return prev.map((r) => {
          if (String(r.id) !== String(m.roomId)) return r;
          const isActive = String(r.id) === String(activeRoomId);
          const isOwn = m.senderId === user.id;
          return {
            ...r,
            lastMessage: m,
            unreadCount: isActive || isOwn ? 0 : (r.unreadCount ?? 0) + 1,
          };
        });
      });
    };

    const onRoomUpdated = (room: Room) => {
      qc.setQueryData<Room[]>(["rooms"], (prev) => {
        if (!prev) return [room];
        const exists = prev.some((r) => String(r.id) === String(room.id));
        if (exists) return prev.map((r) => String(r.id) === String(room.id) ? { ...r, ...room } : r);
        return [room, ...prev];
      });
    };

    const onRoomInvalidate = () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
    };

    socket.on("new_message", onAnyMessage);
    socket.on("message", onAnyMessage);
    socket.on("message_created", onAnyMessage);
    socket.on("newMessage", onAnyMessage);
    socket.on("chatMessage", onAnyMessage);

    socket.on("room_created", onRoomUpdated);
    socket.on("roomCreated", onRoomUpdated);
    socket.on("room_updated", onRoomUpdated);
    socket.on("roomUpdated", onRoomUpdated);
    socket.on("room_added", onRoomUpdated);
    socket.on("roomAdded", onRoomUpdated);

    socket.on("member_added", onRoomInvalidate);
    socket.on("memberAdded", onRoomInvalidate);
    socket.on("member_joined", onRoomInvalidate);
    socket.on("memberJoined", onRoomInvalidate);
    socket.on("added_to_room", onRoomInvalidate);
    socket.on("addedToRoom", onRoomInvalidate);
    socket.on("invited_to_room", onRoomInvalidate);
    socket.on("invitedToRoom", onRoomInvalidate);

    socket.on("member_removed", onRoomInvalidate);
    socket.on("memberRemoved", onRoomInvalidate);
    socket.on("removed_from_room", onRoomInvalidate);
    socket.on("removedFromRoom", onRoomInvalidate);

    socket.on("room_deleted", onRoomInvalidate);
    socket.on("roomDeleted", onRoomInvalidate);

    const debugAny = (event: string, ...args: any[]) => {
      if (
        event.toLowerCase().includes("room") ||
        event.toLowerCase().includes("member") ||
        event.toLowerCase().includes("group") ||
        event.toLowerCase().includes("invite")
      ) {
        console.log("[SOCKET ROOM DEBUG]", event, args);
      }
    };
    socket.onAny(debugAny);

    return () => {
      socket.off("new_message", onAnyMessage);
      socket.off("message", onAnyMessage);
      socket.off("message_created", onAnyMessage);
      socket.off("newMessage", onAnyMessage);
      socket.off("chatMessage", onAnyMessage);

      socket.off("room_created", onRoomUpdated);
      socket.off("roomCreated", onRoomUpdated);
      socket.off("room_updated", onRoomUpdated);
      socket.off("roomUpdated", onRoomUpdated);
      socket.off("room_added", onRoomUpdated);
      socket.off("roomAdded", onRoomUpdated);

      socket.off("member_added", onRoomInvalidate);
      socket.off("memberAdded", onRoomInvalidate);
      socket.off("member_joined", onRoomInvalidate);
      socket.off("memberJoined", onRoomInvalidate);
      socket.off("added_to_room", onRoomInvalidate);
      socket.off("addedToRoom", onRoomInvalidate);
      socket.off("invited_to_room", onRoomInvalidate);
      socket.off("invitedToRoom", onRoomInvalidate);

      socket.off("member_removed", onRoomInvalidate);
      socket.off("memberRemoved", onRoomInvalidate);
      socket.off("removed_from_room", onRoomInvalidate);
      socket.off("removedFromRoom", onRoomInvalidate);

      socket.off("room_deleted", onRoomInvalidate);
      socket.off("roomDeleted", onRoomInvalidate);

      socket.offAny(debugAny);
    };
  }, [socket, user, qc, activeRoomId]);

  // Clear unread when opening a room
  useEffect(() => {
    if (!activeRoomId) return;
    qc.setQueryData<Room[]>(["rooms"], (prev) =>
      prev?.map((r) => (String(r.id) === String(activeRoomId) ? { ...r, unreadCount: 0 } : r)),
    );
  }, [activeRoomId, qc]);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const activeRoom = roomsQuery.data?.find((r) => String(r.id) === String(activeRoomId)) ?? null;

  if (!hydrated || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground animate-pulse font-medium text-sm">
        Yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground antialiased">
      {/* Sidebar — Mobil dizayn moslashtirildi */}
      <aside 
        className={`flex w-full md:w-[350px] shrink-0 flex-col border-r border-border/60 bg-card transition-all duration-300 ${
          activeRoomId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3.5 bg-background/50 backdrop-blur-md">
          <Avatar user={user} size={42} showStatus online={connected} className="ring-2 ring-primary/10" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-tight">
              {user.displayName || user.username}
            </div>
            <div className="flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {connected ? "Onlayn" : "Ulanmoqda…"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Chiqish"
            className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Qidiruv bo'limi */}
        <div className="px-4 py-3 bg-background/30">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Foydalanuvchi qidirish…"
              className="w-full rounded-xl border border-border/80 bg-muted/50 py-2.5 pr-4 pl-10 text-sm outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Ro'yxatlar bo'limi */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-2">
          {query.trim() ? (
            <div className="space-y-1">
              <SectionLabel>Foydalanuvchilar</SectionLabel>
              {usersQuery.isLoading ? (
                <Empty>Qidirilmoqda…</Empty>
              ) : filteredUsers.length === 0 ? (
                <Empty>Foydalanuvchi topilmadi</Empty>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openPrivate(u.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-muted active:scale-[0.99]"
                  >
                    <Avatar user={u} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {u.displayName || u.username}
                      </div>
                      <div className="truncate text-xs text-muted-foreground/80">
                        @{u.username}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <SectionLabel className="!p-0">Suhbatlar</SectionLabel>
                <button
                  onClick={() => setShowGroupModal(true)}
                  title="Yangi guruh"
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
                >
                  <Plus size={18} />
                </button>
              </div>
              {roomsQuery.isLoading ? (
                <Empty>Yuklanmoqda…</Empty>
              ) : roomsQuery.error ? (
                <Empty>Suhbatlarni yuklab bo'lmadi</Empty>
              ) : !roomsQuery.data || roomsQuery.data.length === 0 ? (
                <Empty>Hali suhbat yo'q. Foydalanuvchini qidiring.</Empty>
              ) : (
                roomsQuery.data.map((r) => (
                  <RoomRow
                    key={r.id}
                    room={r}
                    currentUserId={user.id}
                    active={String(r.id) === String(activeRoomId)}
                    onClick={() => setActiveRoomId(r.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Chat paneli — Mobil versiya interfeysi toʻliq optimallashtirildi */}
      <main 
        className={`flex flex-1 items-stretch bg-background transition-all duration-300 ${
          activeRoomId ? "flex" : "hidden md:flex"
        }`}
      >
        {activeRoom ? (
          <div className="flex flex-1 flex-col h-full relative">
            {/* 📱 Mobil uchun Orqaga qaytish tugmasi paneli (Header ustiga chiqib ketmaydi) */}
            <div className="md:hidden flex items-center px-4 py-2 border-b border-border/50 bg-background/80 backdrop-blur-md min-h-[57px] shrink-0 gap-2 z-10">
              <button
                onClick={() => setActiveRoomId(null)}
                className="flex items-center justify-center h-9 w-9 rounded-full bg-muted/80 text-foreground active:scale-95 transition-all"
                type="button"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold truncate">
                  {activeRoom.type === "PRIVATE"
                    ? activeRoom.members?.find((m) => m.userId !== user.id)?.user?.displayName || activeRoom.members?.find((m) => m.userId !== user.id)?.user?.username
                    : activeRoom.name}
                </span>
              </div>
            </div>
            
            {/* Chat ichki qismi */}
            <div className="flex-1 h-full overflow-hidden">
              <ChatPanel key={activeRoom.id} room={activeRoom} currentUser={user} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="text-center max-w-sm animate-fade-in">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <MessageCircle size={36} className="stroke-[1.5]" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Xush kelibsiz, {user.displayName || user.username}!</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Suhbatni tanlang yoki yangi foydalanuvchini qidirib boshlang.
              </p>
            </div>
          </div>
        )}
      </main>

      <CreateGroupModal
        open={showGroupModal}
        currentUserId={user.id}
        onClose={() => setShowGroupModal(false)}
        onCreated={(room) => {
          qc.invalidateQueries({ queryKey: ["rooms"] });
          setActiveRoomId(room.id);
        }}
      />
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-2 py-1 text-[11px] font-bold tracking-wider text-muted-foreground/60 uppercase ${className}`}>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground/70 bg-muted/10 rounded-xl border border-dashed border-border/40 m-2">{children}</div>;
}

function RoomRow({
  room,
  currentUserId,
  active,
  onClick,
}: {
  room: Room;
  currentUserId: string;
  active: boolean;
  onClick: () => void;
}) {
  const otherUser =
    room.type === "PRIVATE"
      ? room.members?.find((m) => m.userId !== currentUserId)?.user
      : undefined;
  const name = otherUser?.displayName || otherUser?.username || room.name || "Suhbat";
  const preview = room.lastMessage?.isDeleted
    ? "O'chirilgan xabar"
    : room.lastMessage?.content ?? "";
  const time = room.lastMessage?.createdAt ? formatTime(room.lastMessage.createdAt) : "";
  const unread = room.unreadCount ?? 0;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-all ${
        active 
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
          : "hover:bg-muted/70 active:bg-muted"
      }`}
    >
      <Avatar
        user={otherUser ?? null}
        name={name}
        size={44}
        showStatus={room.type === "PRIVATE"}
        online={otherUser?.status === "ONLINE"}
        className={active ? "ring-2 ring-primary-foreground/20" : ""}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="truncate text-sm font-semibold tracking-tight">{name}</span>
          <span className={`shrink-0 text-[11px] font-medium ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-xs ${active ? "text-primary-foreground/70" : "text-muted-foreground/90"}`}>
            {preview || "Xabarlar yo'q"}
          </span>
          {unread > 0 && (
            <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
              active 
                ? "bg-white text-primary" 
                : "bg-primary text-primary-foreground"
            }`}>
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}