import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { PublicPlayer } from "./lobbyHelpers";
import { Colors, Fonts, Spacing, Sticker } from "../constants/colors";

type Props = {
  player: PublicPlayer;
  isCurrentPlayer: boolean;
  viewerIsHost: boolean;
  onRemove: (name: string) => void;
};

export function PlayerRow({ player, isCurrentPlayer, viewerIsHost, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.nameSection}>
        <Text style={styles.name}>{player.name}</Text>
        <View style={styles.badges}>
          {player.isHost && <Badge label="HOST" color={Colors.gold500} textColor={Colors.ink900} />}
          {isCurrentPlayer && <Badge label="YOU" color={Colors.bgElevated} textColor={Colors.textMuted} />}
        </View>
      </View>

      {/* Host can remove anyone except themselves */}
      {viewerIsHost && !isCurrentPlayer && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(player.name)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Badge({
  label,
  color,
  textColor,
}: {
  label: string;
  color: string;
  textColor: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgSurface,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    shadowColor: Colors.ink900,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  nameSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.textBody,
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: Fonts.stamp,
    fontSize: 10,
    letterSpacing: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Colors.bgElevated,
    borderWidth: 2,
    borderColor: Colors.ink800,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
  },
});
