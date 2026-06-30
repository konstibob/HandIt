import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Badge, type BadgeVariant } from "../components/ui/Badge";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../constants/colors";
import type { MyGame } from "./useMyGames";

// A row in the "Your Lobbys" list. Leads with the host-chosen room name (player
// aliases repeat across games, so they're not useful here). Shows a live status
// badge — "N players" while filling, "N alive" once running — and, for started/
// finished games, how many players it started with.

type Props = {
  game: MyGame;
  onPress: () => void;
  onDismiss?: () => void;
};

function statusBadge(game: MyGame): { label: string; variant: BadgeVariant; dot: boolean } {
  if (game.phase === "joinable") {
    const n = game.playerCount;
    return { label: `${n} ${n === 1 ? "player" : "players"}`, variant: "gold", dot: false };
  }
  if (game.phase === "started") {
    return game.yourStatus === "dead"
      ? { label: "You're out", variant: "dead", dot: true }
      : { label: `${game.aliveCount} alive`, variant: "alive", dot: true };
  }
  return { label: "Finished", variant: "neutral", dot: false };
}

function subtitle(game: MyGame): string {
  // Live count while still filling up; otherwise the snapshot from kickoff.
  if (game.phase === "joinable") return "Waiting to start";
  const started = game.startedPlayerCount ?? game.playerCount;
  const startedLine = `Started with ${started} ${started === 1 ? "player" : "players"}`;
  if (game.phase === "ended" && game.winnerName) {
    return `${game.winnerName} won · ${startedLine.toLowerCase()}`;
  }
  return startedLine;
}

export function LobbyCard({ game, onPress, onDismiss }: Props) {
  const badge = statusBadge(game);
  const ended = game.phase === "ended";
  const title = game.roomName?.trim() || game.gameCode;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.badgeRow}>
          <Badge label={badge.label} variant={badge.variant} dot={badge.dot} />
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle(game)}
        </Text>
      </View>

      {ended && onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={8}
          accessibilityLabel="Remove finished game"
          style={styles.remove}
        >
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.bgElevated,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md - 2,
  },
  body: { flex: 1, minWidth: 0, gap: 6, alignItems: "flex-start" },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textStrong,
  },
  badgeRow: { flexDirection: "row" },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  chevron: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xs,
  },
  remove: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgSunken,
    borderWidth: 2,
    borderColor: Colors.ink900,
  },
  removeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textFaint,
  },
});
