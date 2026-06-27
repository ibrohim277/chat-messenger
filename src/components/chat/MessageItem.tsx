import { useState } from "react";
import { Check, CheckCheck, MoreVertical, Pencil, Reply, Smile, Trash2 } from "lucide-react";
import type { Message } from "@/lib/types";
import { Avatar } from "@/components/chat/Avatar";
import { formatFullTime, formatTime } from "@/lib/format";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
  isGroup: boolean;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDelete: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  isRead?: boolean;
}

export function MessageItem({
  message,
  isOwn,
  showAvatar,
  showName,
  isGroup,
  onReply,
  onEdit,
  onDelete,
  onReact,
  isRead,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const reactionGroups = (message.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-4 py-1`}>
        <div className="max-w-[70%] rounded-2xl bg-surface-2/50 px-3 py-2 text-xs italic text-muted-foreground">
          O'chirilgan xabar
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex gap-2 px-4 ${showAvatar ? "pt-2" : "pt-0.5"} ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className="w-9 shrink-0">
        {showAvatar && !isOwn && <Avatar user={message.sender} size={36} />}
      </div>

      <div className={`flex max-w-[75%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {showName && !isOwn && isGroup && (
          <div className="mb-0.5 px-2 text-xs font-medium text-primary">
            {message.sender.displayName || message.sender.username}
          </div>
        )}

        <div className="relative">
          <div
            className={`relative rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
              isOwn ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-surface-2 text-foreground"
            }`}
          >
            {message.replyTo && (
              <div
                className={`mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs ${
                  isOwn
                    ? "border-white/60 bg-white/10"
                    : "border-primary bg-background/40"
                }`}
              >
                <div className="font-medium opacity-90">
                  {message.replyTo.sender?.displayName || message.replyTo.sender?.username || "User"}
                </div>
                <div className="line-clamp-2 opacity-80">{message.replyTo.content}</div>
              </div>
            )}

            <div className="whitespace-pre-wrap">{message.content}</div>

            <div className={`mt-1 flex items-center gap-1 text-[10px] ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
              {message.isEdited && <span>tahrirlangan</span>}
              <span title={formatFullTime(message.createdAt)}>{formatTime(message.createdAt)}</span>
              {isOwn && (isRead ? <CheckCheck size={12} /> : <Check size={12} />)}
            </div>
          </div>

          {/* Hover actions */}
          <div
            className={`absolute top-0 ${
              isOwn ? "right-full mr-1" : "left-full ml-1"
            } flex -translate-y-1 items-center gap-0.5 rounded-lg border border-border bg-surface px-1 py-0.5 opacity-0 shadow-md transition group-hover:opacity-100`}
          >
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Reaksiya"
            >
              <Smile size={14} />
            </button>
            <button
              onClick={() => onReply(message)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Javob berish"
            >
              <Reply size={14} />
            </button>
            {isOwn && (
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Yana"
              >
                <MoreVertical size={14} />
              </button>
            )}
          </div>

          {pickerOpen && (
            <div
              className={`absolute z-10 mt-1 ${
                isOwn ? "right-0" : "left-0"
              } top-full flex gap-1 rounded-full border border-border bg-popover px-2 py-1.5 shadow-lg`}
            >
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onReact(message, e);
                    setPickerOpen(false);
                  }}
                  className="rounded-full text-lg transition hover:scale-125"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {menuOpen && isOwn && (
            <div
              className={`absolute z-10 mt-1 ${
                isOwn ? "right-0" : "left-0"
              } top-full min-w-[140px] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg`}
            >
              <button
                onClick={() => {
                  onEdit(message);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <Pencil size={14} /> Tahrirlash
              </button>
              <button
                onClick={() => {
                  onDelete(message);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
              >
                <Trash2 size={14} /> O'chirish
              </button>
            </div>
          )}
        </div>

        {Object.keys(reactionGroups).length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? "justify-end" : ""}`}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact(message, emoji)}
                className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs hover:bg-accent"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
