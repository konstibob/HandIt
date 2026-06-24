import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../constants/colors";

// A roster row for the in-game players list: avatar + name (+ HOST/YOU tags) +
// kill count, with an Alive/Out status badge on the right. Port of PlayerCard.jsx.

type Props = {
  name: string;
  state: "alive" | "dead";
  kills: number;
  host?: boolean;
  you?: boolean;
};

export function PlayerListCard({ name, state, kills, host = false, you = false }: Props) {
  const dead = state === "dead";
  return (
    <View style={styles.card}>
      <Avatar name={name} state={state} size={46} ring={false} />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, dead && styles.nameDead]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {host && <Badge label="HOST" variant="gold" />}
          {you && <Badge label="YOU" variant="neutral" />}
        </View>
        <Text style={styles.kills}>
          {kills > 0 ? `${kills} elimination${kills > 1 ? "s" : ""}` : "No kills yet"}
        </Text>
      </View>
      <Badge label={dead ? "Out" : "Alive"} variant={dead ? "dead" : "alive"} dot />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md - 2,
    backgroundColor: Colors.bgElevated,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md - 2,
  },
  body: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.textStrong,
  },
  nameDead: {
    color: Colors.textFaint,
    textDecorationLine: "line-through",
  },
  kills: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textFaint,
    marginTop: 2,
  },
});
