import { StyleSheet, View } from "react-native";
import { PlayerListCard } from "./PlayerListCard";
import { Spacing } from "../constants/colors";
import type { PublicPlayer } from "../lobby/lobbyHelpers";

// Full roster, sorted alive-first (most kills first), dead last — so "who's
// still in" reads at a glance while keeping the fallen for context.

type Props = {
  players: PublicPlayer[];
  playerName: string | null;
};

export function PlayersList({ players, playerName }: Props) {
  const sorted = [...players].sort((a, b) => {
    if (a.status !== b.status) return a.status === "alive" ? -1 : 1;
    return b.kills - a.kills;
  });

  return (
    <View style={styles.list}>
      {sorted.map((p) => (
        <PlayerListCard
          key={p.name}
          name={p.name}
          state={p.status}
          kills={p.kills}
          host={p.isHost}
          you={p.name === playerName}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
});
