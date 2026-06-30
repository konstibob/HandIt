import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getUserId } from "../lib/storage";

// The single source of truth for "which lobbies am I in". Subscribes to
// api.lobby.myGames keyed by this device's userId token, replacing the old
// one-session localStorage. Both the "Your Lobbys" list and every per-game
// identity lookup (which playerId / name am I in lobby X?) flow through here.

export type MyGame = {
  gameId: string;
  gameCode: string;
  roomName: string | null;
  playerId: string;
  playerName: string;
  phase: "joinable" | "started" | "ended";
  yourStatus: "alive" | "dead";
  playerCount: number;
  aliveCount: number;
  startedPlayerCount: number | null;
  winnerName: string | null;
  joinedAt: number;
};

export function useMyGames() {
  const userId = getUserId();
  const games = useQuery(api.lobby.myGames, { userId }) as
    | MyGame[]
    | undefined;

  const isLoading = games === undefined;
  const list = games ?? [];

  // Active = not yet finished. Drives the rejoin shortcut and the tab badge.
  const activeGames = list.filter((g) => g.phase !== "ended");

  // Resolve this user's identity within a specific lobby (by game code). Returns
  // null if they aren't in that game — callers use that to redirect home.
  function findGame(code: string | undefined | null): MyGame | null {
    if (!code) return null;
    const upper = code.toUpperCase();
    return list.find((g) => g.gameCode.toUpperCase() === upper) ?? null;
  }

  return { games: list, activeGames, isLoading, findGame };
}
