import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getPlayerSession, clearPlayerSession } from "../lib/storage";

// On the home screen, checks whether the player is still in an active lobby.
// If yes → navigate back into it. If the session is stale → clear it.

export function useRejoin() {
  const session = getPlayerSession();
  const router = useRouter();

  const rejoinData = useQuery(
    api.lobby.rejoinCheck,
    session
      ? { playerId: session.playerId as Id<"players"> }
      : "skip"
  );

  useEffect(() => {
    if (rejoinData === null) {
      // Player no longer exists or game ended — stale session
      clearPlayerSession();
    } else if (rejoinData) {
      router.replace(`/lobby/${rejoinData.gameCode}`);
    }
  }, [rejoinData, router]);

  // True while we are waiting for the rejoin check to resolve
  const isChecking = session !== null && rejoinData === undefined;

  return { isChecking, session };
}
