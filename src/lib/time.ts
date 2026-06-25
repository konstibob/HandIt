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

// A static "time into the game" label for events ("45s in", "8m 30s in"),
// measured from when the game started. Unlike relativeTime it never changes,
// so the kill feed / ring timeline don't have to tick every second.
export function timeIntoGame(
  timestamp: number,
  startedAt: number | null | undefined
): string {
  if (startedAt == null) return "";
  return `${formatDuration((timestamp - startedAt) / 1000)} in`;
}

// A compact label for a span of seconds ("45s", "8m 30s", "1h 2m"). Used by the
// end-of-game leaderboard to show how long each player survived.
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  if (mins < 60) {
    const rem = s % 60;
    return rem ? `${mins}m ${rem}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours}h ${remMins}m` : `${hours}h`;
}
