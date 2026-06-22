import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import { clearPlayerSession } from "../lib/storage";
import { isPlayerHost, isPlayer } from "./lobbyHelpers";
import type { PublicGame, PublicPlayer } from "./lobbyHelpers";

// Subscribes to the lobby in real-time.
// Detects when the current player has been removed by the host and redirects home.
// Identity is the player's name — the server keeps ids private, so all
// client-side matching is name-based.

export function useLobbyState(gameCode: string, playerName: string | null) {
  const router = useRouter();
  const lobby = useQuery(api.lobby.getLobby, { gameCode });

  const game: PublicGame | null = lobby?.game ?? null;
  const players: PublicPlayer[] = lobby?.players ?? [];
  const isLoading = lobby === undefined;

  const amIHost     = playerName ? isPlayerHost(playerName, players) : false;
  const amIInLobby  = playerName ? isPlayer(playerName, players) : false;

  // Track whether we were ever confirmed in the lobby (guards against early-load false-positives)
  const wasInLobby = useRef(false);
  useEffect(() => {
    if (amIInLobby) wasInLobby.current = true;
  }, [amIInLobby]);

  // Redirect home when the host removes us
  useEffect(() => {
    const kicked =
      !isLoading &&
      wasInLobby.current &&
      !amIInLobby &&
      game !== null &&
      game.phase !== "ended";

    if (kicked) {
      clearPlayerSession();
      router.replace("/");
    }
  }, [isLoading, amIInLobby, game, router]);

  return { game, players, amIHost, amIInLobby, isLoading };
}
