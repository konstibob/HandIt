import { StyleSheet, Text, View } from "react-native";
import { KillFeedCard } from "./KillFeedCard";
import { relativeTime } from "../lib/time";
import { Colors, Fonts, Spacing } from "../constants/colors";

// Shape returned by the getKillFeed query (newest first).
export type KillFeedEntry = {
  victimName: string;
  killerName: string | null;
  eliminatedAt: number;
};

type Props = {
  entries: KillFeedEntry[] | undefined;
};

export function KillFeed({ entries }: Props) {
  if (!entries || entries.length === 0) {
    return (
      <Text style={styles.empty}>No handoffs yet. The hunt is fresh.</Text>
    );
  }

  return (
    <View style={styles.list}>
      {entries.map((e, i) => (
        <KillFeedCard
          key={`${e.victimName}-${e.eliminatedAt}`}
          killerName={e.killerName}
          victimName={e.victimName}
          time={relativeTime(e.eliminatedAt)}
          fresh={i === 0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textFaint,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
});
