import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, MessageCircle, Trash2, X, Shield, Users, ArrowLeft, Loader2, LogOut, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Message, Room, User } from "@/lib/types";
import { Avatar } from "@/components/chat/Avatar";
import { MessageItem } from "@/components/chat/MessageItem";
import { MessageInput } from "@/components/chat/MessageInput";
import { UserProfileModal } from "@/components/chat/UserProfileModal";
import { useSocketStore } from "@/stores/socket";
import { dayLabel, errorMessage } from "@/lib/format";

interface Props {
  room: Room;
  currentUser: User;
  onRoomDeleted?: () => void;
  onBack?: () => void;
}

interface PageData {
  items: Message[];
  nextCursor?: string | null;
}

function normalizeMessagesResponse(data: unknown): PageData {
  if (Array.isArray(data)) return { items: data as Message[], nextCursor: null };
  const obj = data as { items?: Message[]; data?: Message[]; messages?: Message[]; nextCursor?: string | null; cursor?: string | null };
  const items = obj.items ?? obj.data ?? obj.messages ?? [];
  return { items, nextCursor: obj.nextCursor ?? obj.cursor ?? null };
}

export function ChatPanel({ room, currentUser, onRoomDeleted, onBack }: Props) {
  const qc = useQueryClient();
  const socket = useSocketStore((s) => s.socket);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const messagesKey = useMemo(() => ["messages", room.id] as const, [room.id]);

  const messagesQuery = useQuery({
    queryKey: messagesKey,
    queryFn: async () => {
      const { data } = await api.get(`/rooms/${room.id}/messages`, {
        params: { limit: 50 },
      });
      const page = normalizeMessagesResponse(data);
      page.items = [...page.items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return page;
    },
    // POLLING: socket ishlamasa ham 3 soniyada bir yangilanadi
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const roomQuery = useQuery({
    queryKey: ["room", room.id],
    enabled: room.type !== "PRIVATE",
    queryFn: async () => {
      const { data } = await api.get(`/rooms/${room.id}`);
      return data;
    },
  });

  const roomData = roomQuery.data ?? room;
  const members = roomData.members ?? [];
  const messages = messagesQuery.data?.items ?? [];

  const myRole = members.find((m: any) => m.userId === currentUser.id)?.role;
  const canDeleteRoom = room.type === "PRIVATE" || myRole === "ADMIN" || myRole === "OWNER";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [room.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 200) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Room join
  useEffect(() => {
    if (!socket) return;
    const sRoomId = String(room.id);
    socket.emit("join_room", { roomId: sRoomId });
    socket.emit("joinRoom", { roomId: sRoomId });
    socket.emit("join", { roomId: sRoomId });
    socket.emit("subscribe", { roomId: sRoomId });
    return () => {
      socket.emit("leave_room", { roomId: sRoomId });
      socket.emit("leaveRoom", { roomId: sRoomId });
      socket.emit("leave", { roomId: sRoomId });
    };
  }, [socket, room.id]);

  // Mark read
  useEffect(() => {
    if (!socket) return;
    const last = messages[messages.length - 1];
    if (!last) return;
    socket.emit("mark_read", { roomId: String(room.id), messageId: last.id });
  }, [socket, room.id, messages]);

  // Socket listeners — barcha mumkin bo'lgan event nomlarini tinglaydi
  useEffect(() => {
    if (!socket) return;

    const upsertMessage = (m: Message) => {
      // roomId yo'q bo'lsa ham qabul qilamiz (ba'zi backendlar yubormasligi mumkin)
      if (m.roomId && String(m.roomId) !== String(room.id)) {
        qc.invalidateQueries({ queryKey: ["rooms"] });
        return;
      }
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        const items = prev?.items ?? [];
        if (items.some((x) => x.id === m.id)) return prev ?? { items: [m] };
        const sorted = [...items, m].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return { ...prev, items: sorted };
      });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    };

    const updateMessage = (m: Message) => {
      if (m.roomId && String(m.roomId) !== String(room.id)) return;
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.map((x) => (x.id === m.id ? { ...x, ...m } : x)) };
      });
    };

    const removeMessage = (payload: { id: string } | string) => {
      const id = typeof payload === "string" ? payload : payload.id;
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((x) => (x.id === id ? { ...x, isDeleted: true, content: "" } : x)),
        };
      });
    };

    const onTyping = (p: { userId: string; username?: string; displayName?: string; roomId?: string }) => {
      if (p.roomId && String(p.roomId) !== String(room.id)) return;
      if (p.userId === currentUser.id) return;
      setTypingUsers((s) => ({ ...s, [p.userId]: p.displayName || p.username || "Foydalanuvchi" }));
      setTimeout(() => {
        setTypingUsers((s) => { const next = { ...s }; delete next[p.userId]; return next; });
      }, 3500);
    };

    const onStopTyping = (p: { userId: string; roomId?: string }) => {
      if (p.roomId && String(p.roomId) !== String(room.id)) return;
      setTypingUsers((s) => { const next = { ...s }; delete next[p.userId]; return next; });
    };

    const onReactionAdded = (p: {
      messageId: string;
      reaction?: { userId: string; emoji: string };
      userId?: string;
      emoji?: string;
    }) => {
      const userId = p.reaction?.userId ?? p.userId;
      const emoji = p.reaction?.emoji ?? p.emoji;
      if (!userId || !emoji) return;
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((m) => {
            if (m.id !== p.messageId) return m;
            const reactions = (m.reactions ?? []).filter((r) => !(r.userId === userId && r.emoji === emoji));
            reactions.push({ messageId: m.id, userId, emoji });
            return { ...m, reactions };
          }),
        };
      });
    };

    const onReactionRemoved = (p: {
      messageId: string;
      reaction?: { userId: string; emoji: string };
      userId?: string;
      emoji?: string;
    }) => {
      const userId = p.reaction?.userId ?? p.userId;
      const emoji = p.reaction?.emoji ?? p.emoji;
      if (!userId || !emoji) return;
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((m) => {
            if (m.id !== p.messageId) return m;
            const reactions = (m.reactions ?? []).filter((r) => !(r.userId === userId && r.emoji === emoji));
            return { ...m, reactions };
          }),
        };
      });
    };

    // Barcha mumkin bo'lgan xabar event nomlari
    socket.on("new_message", upsertMessage);
    socket.on("message", upsertMessage);
    socket.on("message_created", upsertMessage);
    socket.on("newMessage", upsertMessage);
    socket.on("chat_message", upsertMessage);
    socket.on("chatMessage", upsertMessage);

    socket.on("message_edited", updateMessage);
    socket.on("message_updated", updateMessage);
    socket.on("messageUpdated", updateMessage);
    socket.on("editMessage", updateMessage);

    socket.on("message_deleted", removeMessage);
    socket.on("messageDeleted", removeMessage);
    socket.on("deleteMessage", removeMessage);

    socket.on("typing", onTyping);
    socket.on("userTyping", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("stopTyping", onStopTyping);
    socket.on("userStopTyping", onStopTyping);

    socket.on("reaction_added", onReactionAdded);
    socket.on("reactionAdded", onReactionAdded);
    socket.on("reaction_removed", onReactionRemoved);
    socket.on("reactionRemoved", onReactionRemoved);

    // DEBUG: qaysi event kelayotganini ko'rish uchun (keyinchalik olib tashlang)
    const debugAny = (event: string, ...args: any[]) => {
      if (event.toLowerCase().includes("message") || event.toLowerCase().includes("chat")) {
        console.log("[SOCKET DEBUG]", event, args);
      }
    };
    socket.onAny(debugAny);

    return () => {
      socket.off("new_message", upsertMessage);
      socket.off("message", upsertMessage);
      socket.off("message_created", upsertMessage);
      socket.off("newMessage", upsertMessage);
      socket.off("chat_message", upsertMessage);
      socket.off("chatMessage", upsertMessage);

      socket.off("message_edited", updateMessage);
      socket.off("message_updated", updateMessage);
      socket.off("messageUpdated", updateMessage);
      socket.off("editMessage", updateMessage);

      socket.off("message_deleted", removeMessage);
      socket.off("messageDeleted", removeMessage);
      socket.off("deleteMessage", removeMessage);

      socket.off("typing", onTyping);
      socket.off("userTyping", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("stopTyping", onStopTyping);
      socket.off("userStopTyping", onStopTyping);

      socket.off("reaction_added", onReactionAdded);
      socket.off("reactionAdded", onReactionAdded);
      socket.off("reaction_removed", onReactionRemoved);
      socket.off("reactionRemoved", onReactionRemoved);

      socket.offAny(debugAny);
    };
  }, [socket, room.id, currentUser.id, qc, messagesKey]);

  const lastTypingSentAt = useRef(0);
  const sendTyping = useCallback(() => {
    if (!socket) return;
    const now = Date.now();
    if (now - lastTypingSentAt.current < 2000) return;
    lastTypingSentAt.current = now;
    socket.emit("typing", { roomId: String(room.id) });
    setTimeout(() => socket.emit("stop_typing", { roomId: String(room.id) }), 3000);
  }, [socket, room.id]);

  const sendMessage = async (content: string) => {
    try {
      const payload = {
        content,
        type: "TEXT",
        ...(replyTo && { replyToId: replyTo.id }),
      };
      const { data } = await api.post<Message>(`/rooms/${room.id}/messages`, payload);

      // O'zimizning xabarimizni darhol ko'rsatamiz
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        const items = prev?.items ?? [];
        if (items.some((x) => x.id === data.id)) return prev ?? { items: [data] };
        return { ...prev, items: [...items, data] };
      });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      setReplyTo(null);
    } catch (e) {
      toast.error(errorMessage(e, "Xabar yuborilmadi"));
    }
  };

  const deleteRoom = async () => {
    setIsDeletingRoom(true);
    try {
      await api.delete(`/rooms/${room.id}`);
      toast.success("Suhbat muvaffaqiyatli o'chirildi");
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.removeQueries({ queryKey: ["room", room.id] });
      qc.removeQueries({ queryKey: messagesKey });
      setShowDeleteConfirm(false);
      if (onRoomDeleted) onRoomDeleted();
    } catch (e) {
      toast.error(errorMessage(e, "Suhbatni o'chirib bo'lmadi"));
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const saveEdit = async (content: string) => {
    if (!editing) return;
    try {
      const { data } = await api.patch<Message>(`/rooms/${room.id}/messages/${editing.id}`, { content });
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.map((x) => (x.id === editing.id ? { ...x, ...data } : x)) };
      });
      if (socket) socket.emit("message_edited", data);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["rooms"] });
    } catch (e) {
      toast.error(errorMessage(e, "Tahrirlab bo'lmadi"));
    }
  };

  const deleteMessage = async (m: Message) => {
    try {
      await api.delete(`/rooms/${room.id}/messages/${m.id}`);
      qc.setQueryData<PageData>(messagesKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((x) => (x.id === m.id ? { ...x, isDeleted: true, content: "" } : x)),
        };
      });
      if (socket) socket.emit("message_deleted", { id: m.id, roomId: String(room.id) });
    } catch (e) {
      toast.error(errorMessage(e, "O'chirib bo'lmadi"));
    }
  };

  const toggleReaction = async (m: Message, emoji: string) => {
    const existing = (m.reactions ?? []).some((r) => r.userId === currentUser.id && r.emoji === emoji);
    qc.setQueryData<PageData>(messagesKey, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((x) => {
          if (x.id !== m.id) return x;
          const reactions = (x.reactions ?? []).filter(
            (r) => !(r.userId === currentUser.id && r.emoji === emoji),
          );
          if (!existing) reactions.push({ messageId: m.id, userId: currentUser.id, emoji });
          return { ...x, reactions };
        }),
      };
    });
    try {
      if (existing) {
        await api.delete(`/rooms/${room.id}/messages/${m.id}/reactions`, { params: { emoji } });
      } else {
        await api.post(`/rooms/${room.id}/messages/${m.id}/reactions`, { emoji });
      }
    } catch (e) {
      toast.error(errorMessage(e, "Reaksiya saqlanmadi"));
      messagesQuery.refetch();
    }
  };

  const otherUser =
    room.type === "PRIVATE" ? room.members?.find((m) => m.userId !== currentUser.id)?.user : undefined;
  const headerName = otherUser?.displayName || otherUser?.username || room.name || "Suhbat";
  const isGroup = room.type !== "PRIVATE";
  const subtitle = isGroup
    ? `${members.length} ta a'zo`
    : otherUser?.status === "ONLINE"
      ? "onlayn"
      : otherUser?.lastSeenAt
        ? `oxirgi faollik: ${dayLabel(otherUser.lastSeenAt)}`
        : "oflayn";

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex h-full flex-1 flex-col bg-slate-50 dark:bg-zinc-950 relative overflow-hidden transition-colors duration-200">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-4 py-3 sticky top-0 z-20 shadow-sm">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-1 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ArrowLeft size={18} />
          </button>
        )}

        <button
          onClick={() => (otherUser ? setProfileUser(otherUser) : setShowInfo(true))}
          className="flex items-center gap-3 text-left group min-w-0 flex-1 focus:outline-none"
        >
          <Avatar
            user={otherUser ?? null}
            name={headerName}
            size={40}
            showStatus={!isGroup}
            online={otherUser?.status === "ONLINE"}
            className="ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-300"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100 group-hover:text-primary transition-colors">{headerName}</div>
            <div className="truncate text-xs text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1.5">
              {!isGroup && otherUser?.status === "ONLINE" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {subtitle}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {canDeleteRoom && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-full p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
              title={room.type === "PRIVATE" ? "Suhbatni o'chirish" : "Guruhni o'chirish"}
            >
              <Trash2 size={18} />
            </button>
          )}

          <button
            onClick={() => (otherUser ? setProfileUser(otherUser) : setShowInfo((v) => !v))}
            className={`rounded-full p-2 transition-colors ${showInfo ? 'bg-primary/10 text-primary' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            title="Ma'lumot"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Messages Viewport */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {messagesQuery.isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs font-medium">Xabarlar yuklanmoqda...</span>
          </div>
        ) : messagesQuery.error ? (
          <div className="flex h-full items-center justify-center text-xs font-medium text-red-500 bg-red-50/50 dark:bg-red-950/10 rounded-xl m-4 p-4 text-center">
            Xabarlarni yuklashda xatolik yuz berdi. Iltimos sahifani yangilang.
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 max-w-sm mx-auto text-center p-6">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <MessageCircle size={32} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Hech qanday xabar yo'q</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">Suhbatni boshlash uchun quyidagi maydonga birinchi xabaringizni yozib yuboring.</p>
          </div>
        ) : (
          <MessagesList
            messages={messages}
            currentUserId={currentUser.id}
            isGroup={isGroup}
            onReply={setReplyTo}
            onEdit={setEditing}
            onDelete={deleteMessage}
            onReact={toggleReaction}
          />
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Typing Indicator */}
      <div className="h-6 px-6 relative z-10 bg-gradient-to-t from-slate-50 to-transparent dark:from-zinc-950">
        {typingNames.length > 0 && (
          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center gap-1">
            <span>{typingNames.join(", ")} yozmoqda...</span>
          </div>
        )}
      </div>

      {/* Input Field Area */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-4 py-2">
        <MessageInput
          onSend={sendMessage}
          onTyping={sendTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSaveEdit={saveEdit}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 animate-in fade-in-50 zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              {room.type === "PRIVATE" ? "Suhbatni o'chirish" : "Guruhni o'chirish"}
            </h3>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {room.type === "PRIVATE"
                ? "Ushbu suhbatni o'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi."
                : "Ushbu guruhni butunlay o'chirib tashlamoqchimisiz? Hamma a'zolar va xabarlar o'chib ketadi."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={deleteRoom}
                disabled={isDeletingRoom}
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 transition shadow-sm shadow-red-500/10"
              >
                {isDeletingRoom ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      <UserProfileModal user={profileUser} onClose={() => setProfileUser(null)} />

      {showInfo && isGroup && (
        <GroupInfoDrawer
          room={roomData}
          currentUser={currentUser}
          onClose={() => setShowInfo(false)}
          onPickUser={(u) => {
            setShowInfo(false);
            setProfileUser(u);
          }}
          onMemberRemoved={(userId) => {
            qc.setQueryData(["room", room.id], (prev: any) => {
              if (!prev) return prev;
              return { ...prev, members: prev.members?.filter((m: any) => m.userId !== userId) };
            });
            qc.invalidateQueries({ queryKey: ["room", room.id] });
            qc.invalidateQueries({ queryKey: ["room-members", room.id] });
          }}
        />
      )}
    </div>
  );
}

function MessagesList({
  messages, currentUserId, isGroup, onReply, onEdit, onDelete, onReact,
}: {
  messages: Message[];
  currentUserId: string;
  isGroup: boolean;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDelete: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
}) {
  const elements: React.ReactNode[] = [];
  let lastDate = "";
  let lastSenderId = "";
  let lastTime = 0;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const dateKey = new Date(m.createdAt).toDateString();
    if (dateKey !== lastDate) {
      elements.push(
        <div key={`d-${dateKey}`} className="my-4 flex justify-center">
          <span className="rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 backdrop-blur px-3 py-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 shadow-xs uppercase tracking-wider">
            {dayLabel(m.createdAt)}
          </span>
        </div>,
      );
      lastDate = dateKey;
      lastSenderId = "";
      lastTime = 0;
    }
    const time = new Date(m.createdAt).getTime();
    const sameSender = m.senderId === lastSenderId && time - lastTime < 5 * 60 * 1000;
    const isOwn = m.senderId === currentUserId;

    elements.push(
      <MessageItem
        key={m.id}
        message={m}
        isOwn={isOwn}
        showAvatar={!sameSender}
        showName={!sameSender && isGroup}
        isGroup={isGroup}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onReact={onReact}
        isRead={(m.readBy?.length ?? 0) > 1}
      />,
    );
    lastSenderId = m.senderId;
    lastTime = time;
  }
  return <>{elements}</>;
}

function GroupInfoDrawer({
  room, currentUser, onClose, onPickUser, onMemberRemoved,
}: {
  room: Room;
  currentUser: User;
  onClose: () => void;
  onPickUser: (u: User) => void;
  onMemberRemoved: (userId: string) => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [memberToConfirmRemove, setMemberToConfirmRemove] = useState<{ userId: string; user: User; role: string } | null>(null);

  const myRole = room.members?.find((m) => m.userId === currentUser.id)?.role;
  const canRemove = myRole === "ADMIN" || myRole === "OWNER";

  const handleRemoveMember = async () => {
    if (!memberToConfirmRemove) return;
    const targetUserId = memberToConfirmRemove.userId;
    const targetUserName = memberToConfirmRemove.user.displayName || memberToConfirmRemove.user.username;
    setRemovingId(targetUserId);
    setMemberToConfirmRemove(null);
    try {
      await api.delete(`/rooms/${room.id}/members/${targetUserId}`);
      onMemberRemoved(targetUserId);
      toast.success(`${targetUserName} guruhdan chiqarildi`);
    } catch (e) {
      toast.error(errorMessage(e, "A'zoni chiqarib bo'lmadi"));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
        <div className="h-full w-full max-w-sm overflow-y-auto border-l border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-5">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Users size={16} className="text-primary" /> Guruh ma'lumotlari
            </h2>
            <button onClick={onClose} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
              <X size={16} />
            </button>
          </div>

          <div className="mb-6 flex flex-col items-center gap-2.5 text-center bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 shadow-inner">
            <Avatar user={null} name={room.name ?? "Guruh"} size={72} className="shadow-md" />
            <div className="min-w-0 w-full">
              <div className="text-base font-bold text-zinc-800 dark:text-white truncate">{room.name}</div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">{room.members?.length ?? 0} ta a'zo</div>
            </div>
            {room.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50 leading-relaxed text-left w-full mt-2">
                {room.description}
              </p>
            )}
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto scrollbar-none">
            <div className="px-1 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center justify-between">
              <span>A'zolar ro'yxati</span>
              <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-[9px] lowercase font-normal">{room.members?.length ?? 0} a'zo</span>
            </div>
            <div className="space-y-1">
              {room.members?.map((m) => (
                <div key={m.userId} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/40 border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800/30 transition-all duration-150">
                  <button onClick={() => onPickUser(m.user)} className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none">
                    <Avatar user={m.user} size={36} showStatus online={m.user.status === "ONLINE"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">{m.user.displayName || m.user.username}</div>
                      <div className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">@{m.user.username}</div>
                    </div>
                  </button>
                  {m.role !== "MEMBER" && (
                    <span className="shrink-0 flex items-center gap-0.5 rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary tracking-wide uppercase">
                      <Shield size={8} /> {m.role}
                    </span>
                  )}
                  {canRemove && m.userId !== currentUser.id && m.role !== "OWNER" && (
                    <button onClick={() => setMemberToConfirmRemove(m)} disabled={removingId === m.userId} title="Guruhdan o'chirish" className="shrink-0 rounded-lg p-1.5 text-zinc-400 md:opacity-0 group-hover:opacity-100 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 focus:opacity-100">
                      {removingId === m.userId ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {memberToConfirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <UserMinus size={20} />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">A'zoni chetlatish</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Haqiqatdan ham <span className="font-semibold text-zinc-800 dark:text-zinc-200">{memberToConfirmRemove.user.displayName || memberToConfirmRemove.user.username}</span> guruhdan chiqarilsinmi?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setMemberToConfirmRemove(null)} className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition">
                Bekor qilish
              </button>
              <button onClick={handleRemoveMember} className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 transition shadow-sm shadow-red-500/10">
                Chiqarish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
