import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../components/ui/Avatar";
import {
  SegmentControl,
  type SegmentOption,
} from "../components/ui/SegmentControl";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../constants/colors";
import { formatDuration } from "../lib/time";
import { getRevealedResults, setRevealedResults } from "../lib/storage";

// The end-of-game standings table (the "Results" tab on EndScreen). Rows stagger
// in once per game — a refresh shows the final table instantly. The winner is
// always the most-kills player(s); a toggle re-sorts the visible list by kills
// or survival, but the crown only ever tracks kills.

// One row of api.lobby.getResults — kept in sync with the query's return shape.
export type StandingRow = {
  name: string;
  kills: number;
  status: "alive" | "dead";
  survivedSeconds: number | null;
  isWinner: boolean;
};

type Metric = "kills" | "survived";

type Props = {
  rows: StandingRow[];
  playerName: string | null;
  gameCode: string;
};

const ROW_STAGGER = 90; // ms between each row sliding in

export function Leaderboard({ rows, playerName, gameCode }: Props) {
  const [metric, setMetric] = useState<Metric>("kills");

  // Play the reveal only the first time this client sees the results.
  const [play] = useState(() => !getRevealedResults(gameCode));
  useEffect(() => {
    if (!play) return;
    const total = rows.length * ROW_STAGGER + 500;
    const t = setTimeout(() => setRevealedResults(gameCode), total);
    return () => clearTimeout(t);
  }, []);

  // The query already sorts by kills; re-sort locally only for the survival view.
  const visible =
    metric === "kills"
      ? rows
      : [...rows].sort(
          (a, b) =>
            (b.survivedSeconds ?? 0) - (a.survivedSeconds ?? 0) ||
            b.kills - a.kills ||
            a.name.localeCompare(b.name)
        );

  const coWinner = rows.filter((r) => r.isWinner).length > 1;

  const metricTabs: SegmentOption<Metric>[] = [
    { key: "kills", label: "Most kills" },
    { key: "survived", label: "Longest alive" },
  ];

  return (
    <View style={styles.wrap}>
      <SegmentControl options={metricTabs} value={metric} onChange={setMetric} />
      <View style={styles.list}>
        {visible.map((row, i) => (
          <LeaderboardRow
            key={row.name}
            row={row}
            rank={i + 1}
            metric={metric}
            isYou={row.name === playerName}
            coWinner={coWinner}
            play={play}
          />
        ))}
      </View>
    </View>
  );
}

function LeaderboardRow({
  row,
  rank,
  metric,
  isYou,
  coWinner,
  play,
}: {
  row: StandingRow;
  rank: number;
  metric: Metric;
  isYou: boolean;
  coWinner: boolean;
  play: boolean;
}) {
  // Starts hidden+below and slides up; winners get a little pop when they land.
  const anim = useRef(new Animated.Value(play ? 0 : 1)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!play) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: (rank - 1) * ROW_STAGGER,
      useNativeDriver: true,
    }).start(() => {
      if (!row.isWinner) return;
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.06, duration: 140, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    });
    // Animate once on mount; re-sorting keeps the same row (keyed by name).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const survivedLabel =
    row.survivedSeconds == null
      ? "—"
      : row.status === "alive"
        ? "survived to the end"
        : formatDuration(row.survivedSeconds);

  return (
    <Animated.View
      style={[
        styles.row,
        row.isWinner && styles.rowWinner,
        isYou && !row.isWinner && styles.rowYou,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { scale: pop },
          ],
        },
      ]}
    >
      <Text style={[styles.rank, row.isWinner && styles.rankWinner]}>{rank}</Text>

      <Avatar name={row.name} state={row.status} size={40} ring={false} />

      <View style={styles.namecol}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {row.name}
          </Text>
          {isYou && <Text style={styles.you}>YOU</Text>}
          {row.isWinner && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{coWinner ? "CO-WINNER" : "WINNER"}</Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.survived, metric === "survived" && styles.survivedActive]}
        >
          {survivedLabel}
        </Text>
      </View>

      <View style={styles.killcol}>
        <Text style={styles.kills}>{row.kills}</Text>
        <Text style={styles.killsLabel}>{row.kills === 1 ? "kill" : "kills"}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  list: { gap: Spacing.sm },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.bgSurface,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  rowWinner: {
    borderColor: Colors.gold500,
    backgroundColor: Colors.bgElevated,
    shadowColor: Colors.ink900,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  rowYou: { borderColor: Colors.gold600 },

  rank: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.textFaint,
    width: 22,
    textAlign: "center",
  },
  rankWinner: { color: Colors.gold500 },

  namecol: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textStrong,
    flexShrink: 1,
  },
  you: {
    fontFamily: Fonts.stamp,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.gold500,
  },
  badge: {
    backgroundColor: Colors.gold500,
    borderWidth: 2,
    borderColor: Colors.ink800,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: Fonts.stamp,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.ink900,
  },
  survived: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  survivedActive: { color: Colors.gold400 },

  killcol: { alignItems: "center", minWidth: 44 },
  kills: { fontFamily: Fonts.display, fontSize: 22, color: Colors.gold500 },
  killsLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
