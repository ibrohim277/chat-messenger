import { X } from "lucide-react";
import type { User } from "@/lib/types";
import { Avatar } from "@/components/chat/Avatar";

interface Props {
  user: User | null;
  onClose: () => void;
}

export function UserProfileModal({ user, onClose }: Props) {
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Profil</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
          <Avatar user={user} size={96} showStatus online={user.status === "ONLINE"} />
          <div>
            <div className="text-lg font-semibold">{user.displayName || user.username}</div>
            <div className="text-sm text-muted-foreground">@{user.username}</div>
          </div>
          {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
          <div className="mt-2 w-full space-y-2 text-left text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Status" value={user.status === "ONLINE" ? "Onlayn" : user.lastSeenAt ? `oxirgi: ${new Date(user.lastSeenAt).toLocaleString()}` : "Oflayn"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  );
}
