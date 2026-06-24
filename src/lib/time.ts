// Compact relative-time labels for the kill feed ("just now", "2 min ago").

export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - timestamp) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs} sec ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
