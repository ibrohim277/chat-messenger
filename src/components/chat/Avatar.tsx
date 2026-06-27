import type { User } from "@/lib/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  user?: Pick<User, "displayName" | "username" | "avatarUrl"> | null;
  name?: string;
  size?: number;
  className?: string;
  showStatus?: boolean;
  online?: boolean;
}

export function Avatar({ user, name, size = 40, className = "", showStatus, online }: Props) {
  const label = name ?? user?.displayName ?? user?.username ?? "?";
  const url = user?.avatarUrl;
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-medium text-foreground/90 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(label) || "?"}</span>
      )}
      {showStatus && (
        <span
          className={`absolute right-0 bottom-0 block rounded-full ring-2 ring-background ${online ? "bg-online" : "bg-muted-foreground/50"}`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
