export function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Kecha";
  return d.toLocaleDateString();
}

export function formatFullTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Bugun";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Kecha";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function errorMessage(e: unknown, fallback = "Xatolik yuz berdi"): string {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string") return msg;
  if (e instanceof Error) return e.message;
  return fallback;
}
