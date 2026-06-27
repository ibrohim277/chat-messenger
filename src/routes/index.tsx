import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useEffect, useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import { LogOut, Search, MessageCircle, Plus } from "lucide-react";

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
    // POLLING: socket ishlamasa ham 5 soniyada bir yangilanadi
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

    // Xabar kelganda rooms listini yangilash
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

    // Yangi guruh yaratilganda yoki biror guruhga qo'shilganda
    const onRoomUpdated = (room: Room) => {
      qc.setQueryData<Room[]>(["rooms"], (prev) => {
        if (!prev) return [room];
        // Agar allaqachon bor bo'lsa update qilamiz, yo'q bo'lsa qo'shamiz
        const exists = prev.some((r) => String(r.id) === String(room.id));
        if (exists) return prev.map((r) => String(r.id) === String(room.id) ? { ...r, ...room } : r);
        return [room, ...prev];
      });
    };

    const onRoomInvalidate = () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
    };

    // Xabar eventlari
    socket.on("new_message", onAnyMessage);
    socket.on("message", onAnyMessage);
    socket.on("message_created", onAnyMessage);
    socket.on("newMessage", onAnyMessage);
    socket.on("chatMessage", onAnyMessage);

    // Guruh/room eventlari — barcha mumkin bo'lgan nomlar
    socket.on("room_created", onRoomUpdated);
    socket.on("roomCreated", onRoomUpdated);
    socket.on("room_updated", onRoomUpdated);
    socket.on("roomUpdated", onRoomUpdated);
    socket.on("room_added", onRoomUpdated);
    socket.on("roomAdded", onRoomUpdated);

    // A'zo qo'shilganda
    socket.on("member_added", onRoomInvalidate);
    socket.on("memberAdded", onRoomInvalidate);
    socket.on("member_joined", onRoomInvalidate);
    socket.on("memberJoined", onRoomInvalidate);
    socket.on("added_to_room", onRoomInvalidate);
    socket.on("addedToRoom", onRoomInvalidate);
    socket.on("invited_to_room", onRoomInvalidate);
    socket.on("invitedToRoom", onRoomInvalidate);

    // A'zo chiqarilganda
    socket.on("member_removed", onRoomInvalidate);
    socket.on("memberRemoved", onRoomInvalidate);
    socket.on("removed_from_room", onRoomInvalidate);
    socket.on("removedFromRoom", onRoomInvalidate);

    // Room o'chirilganda
    socket.on("room_deleted", onRoomInvalidate);
    socket.on("roomDeleted", onRoomInvalidate);

    // DEBUG: barcha eventlarni ko'rish (keyinchalik olib tashlang)
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

      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">

        Loading…

      </div>

    );

  }



  return (

    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">

      {/* Sidebar */}

      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border bg-surface">

        <div className="flex items-center gap-3 border-b border-border px-4 py-3">

          <Avatar user={user} size={40} showStatus online={connected} />

          <div className="min-w-0 flex-1">

            <div className="truncate text-sm font-semibold">

              {user.displayName || user.username}

            </div>

            <div className="truncate text-xs text-muted-foreground">

              {connected ? "Onlayn" : "Ulanmoqda…"}

            </div>

          </div>

          <button

            onClick={handleLogout}

            title="Chiqish"

            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"

          >

            <LogOut size={18} />

          </button>

        </div>



        <div className="px-3 py-3">

          <div className="relative">

            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />

            <input

              value={query}

              onChange={(e) => setQuery(e.target.value)}

              placeholder="Foydalanuvchi qidirish…"

              className="w-full rounded-lg border border-border bg-input py-2 pr-3 pl-9 text-sm outline-none focus:border-ring"

            />

          </div>

        </div>



        <div className="flex-1 overflow-y-auto px-2 pb-3">

          {query.trim() ? (

            <div>

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

                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent"

                  >

                    <Avatar user={u} size={36} />

                    <div className="min-w-0 flex-1">

                      <div className="truncate text-sm font-medium">

                        {u.displayName || u.username}

                      </div>

                      <div className="truncate text-xs text-muted-foreground">

                        @{u.username}

                      </div>

                    </div>

                  </button>

                ))

              )}

            </div>

          ) : (

            <div>

              <div className="flex items-center justify-between px-2 py-1">

                <SectionLabel className="!p-0">Suhbatlar</SectionLabel>

                <button

                  onClick={() => setShowGroupModal(true)}

                  title="Yangi guruh"

                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"

                >

                  <Plus size={16} />

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



      {/* Chat panel */}

      <main className="flex flex-1 items-stretch bg-background">

        {activeRoom ? (

          <ChatPanel key={activeRoom.id} room={activeRoom} currentUser={user} />

        ) : (

          <div className="flex flex-1 items-center justify-center">

            <div className="text-center">

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface">

                <MessageCircle size={28} className="text-primary" />

              </div>

              <h2 className="text-lg font-semibold">Xush kelibsiz, {user.displayName || user.username}</h2>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">

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

    <div className={`px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase ${className}`}>

      {children}

    </div>

  );

}



function Empty({ children }: { children: React.ReactNode }) {

  return <div className="px-3 py-6 text-center text-xs text-muted-foreground">{children}</div>;

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

      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${

        active ? "bg-accent" : "hover:bg-accent/60"

      }`}

    >

      <Avatar

        user={otherUser ?? null}

        name={name}

        size={42}

        showStatus={room.type === "PRIVATE"}

        online={otherUser?.status === "ONLINE"}

      />

      <div className="min-w-0 flex-1">

        <div className="flex items-center justify-between gap-2">

          <span className="truncate text-sm font-medium">{name}</span>

          <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span>

        </div>

        <div className="flex items-center justify-between gap-2">

          <span className="truncate text-xs text-muted-foreground">{preview || "Xabarlar yo'q"}</span>

          {unread > 0 && (

            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">

              {unread}

            </span>

          )}

        </div>

      </div>

    </button>

  );

}
