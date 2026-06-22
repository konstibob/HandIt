// Public shapes returned by api.lobby.getLobby. These intentionally carry NO
// player `_id`s and NO secret targets — only what every client may see. Players
// are referenced across clients by their (lobby-unique) name.
export type PublicPlayer = {
  name: string;
  isHost: boolean;
  status: "alive" | "dead";
  kills: number;
};

export type PublicGame = {
  gameCode: string;
  phase: "joinable" | "started" | "ended";
  winnerName: string | null;
};

// Pure helpers — no hooks, no side effects. Match by name since ids stay private.

export function isPlayerHost(
  playerName: string,
  players: PublicPlayer[]
): boolean {
  return players.find((p) => p.name === playerName)?.isHost ?? false;
}

export function isPlayer(
  playerName: string,
  players: PublicPlayer[]
): boolean {
  return players.some((p) => p.name === playerName);
}

export function getHostName(players: PublicPlayer[]): string | null {
  return players.find((p) => p.isHost)?.name ?? null;
}
