import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Room, User } from "@/lib/types";
import { Avatar } from "@/components/chat/Avatar";
import { errorMessage } from "@/lib/format";

interface Props {
  open: boolean;
  currentUserId: string;
  onClose: () => void;
  onCreated: (room: Room) => void;
}

export function CreateGroupModal({ open, currentUserId, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, User>>({});
  const [submitting, setSubmitting] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
    enabled: open,
  });

  const filtered = useMemo(() => {
    const list = usersQuery.data ?? [];
    const q = query.trim().toLowerCase();
    return list
      .filter((u) => u.id !== currentUserId)
      .filter(
        (u) => !q || u.username.toLowerCase().includes(q) || (u.displayName ?? "").toLowerCase().includes(q),
      );
  }, [usersQuery.data, query, currentUserId]);

  const toggle = (u: User) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[u.id]) delete next[u.id];
      else next[u.id] = u;
      return next;
    });

  const submit = async () => {
    const memberIds = Object.keys(selected);
    if (!name.trim()) return toast.error("Guruh nomini kiriting");
    if (memberIds.length < 1) return toast.error("Kamida bitta a'zo tanlang");
    setSubmitting(true);
    try {
      const { data } = await api.post<Room>("/rooms", {
        name: name.trim(),
        type: "GROUP",
        memberIds,
      });
      toast.success("Guruh yaratildi");
      onCreated(data);
      setName("");
      setSelected({});
      setQuery("");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, "Guruh yaratib bo'lmadi"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Yangi guruh</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Guruh nomi"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="A'zolarni qidirish…"
              className="w-full rounded-lg border border-border bg-input py-2 pr-3 pl-9 text-sm outline-none focus:border-ring"
            />
          </div>

          {Object.keys(selected).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.values(selected).map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggle(u)}
                  className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-1 text-xs text-primary"
                >
                  <span>{u.displayName || u.username}</span>
                  <X size={12} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto border-t border-border px-2 py-2">
          {usersQuery.isLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Yuklanmoqda…</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Foydalanuvchi topilmadi</div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => toggle(u)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent ${
                  selected[u.id] ? "bg-accent/60" : ""
                }`}
              >
                <Avatar user={u} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.displayName || u.username}</div>
                  <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                </div>
                <div
                  className={`h-4 w-4 shrink-0 rounded border ${
                    selected[u.id] ? "border-primary bg-primary" : "border-border"
                  }`}
                />
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Bekor qilish
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Yaratilmoqda…" : "Yaratish"}
          </button>
        </div>
      </div>
    </div>
  );
}
