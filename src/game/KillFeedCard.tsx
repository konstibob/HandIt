import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "../components/ui/Avatar";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../constants/colors";

// One event row in the kill feed: "<killer> handed it to <victim> · <time>".
// Tone is gleeful, never grim — it's a party game. The freshest kill gets a red
// outline + elevated background to draw the eye. Port of KillFeedCard.jsx.

type Props = {
  killerName: string | null;
  victimName: string;
  time: string;
  fresh?: boolean;
};

export function KillFeedCard({ killerName, victimName, time, fresh = false }: Props) {
  return (
    <View
      style={[
        styles.card,
        fresh && styles.cardFresh,
      ]}
    >
      <Avatar name={killerName ?? "?"} size={36} ring={false} />
      <View style={styles.body}>
        <Text style={styles.line} numberOfLines={2}>
          <Text style={styles.strong}>{killerName ?? "Someone"}</Text>
          <Text style={styles.weapon}> handed it to </Text>
          <Text style={styles.victim}>{victimName}</Text>
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Avatar name={victimName} size={36} state="dead" ring={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 4,
    backgroundColor: Colors.bgSurface,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md - 2,
  },
  cardFresh: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.red500,
  },
  body: { flex: 1, minWidth: 0 },
  line: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textBody,
  },
  strong: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textStrong,
  },
  weapon: {
    color: Colors.red400,
    fontFamily: Fonts.bodyBold,
  },
  victim: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textStrong,
    textDecorationLine: "line-through",
    textDecorationColor: Colors.red500,
  },
  time: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textFaint,
    marginTop: 2,
  },
});
