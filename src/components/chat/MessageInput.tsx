import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import type { Message } from "@/lib/types";

interface Props {
  onSend: (content: string) => void | Promise<void>;
  onTyping: () => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  editing?: Message | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (content: string) => void | Promise<void>;
}

export function MessageInput({ onSend, onTyping, replyTo, onCancelReply, editing, onCancelEdit, onSaveEdit }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(editing.content);
      ref.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo]);

  const autoresize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const submit = async () => {
    const text = value.trim();
    if (!text) return;
    if (editing && onSaveEdit) {
      await onSaveEdit(text);
    } else {
      await onSend(text);
    }
    setValue("");
    requestAnimationFrame(autoresize);
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      {(replyTo || editing) && (
        <div className="mb-2 flex items-center justify-between rounded-md border-l-2 border-primary bg-surface-2 px-3 py-1.5 text-xs">
          <div className="min-w-0">
            <div className="font-medium text-primary">
              {editing ? "Tahrirlash" : `Javob: ${replyTo?.sender?.displayName || replyTo?.sender?.username}`}
            </div>
            <div className="truncate text-muted-foreground">{(editing ?? replyTo)?.content}</div>
          </div>
          <button
            onClick={editing ? onCancelEdit : onCancelReply}
            className="ml-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autoresize();
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Xabar yozing…"
          className="flex-1 resize-none rounded-2xl border border-border bg-input px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
