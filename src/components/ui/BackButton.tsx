import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../../constants/colors";

// Small top-left "back to your lobbies" control. NON-destructive: it just
// navigates to the home screen (where the "Your Lobbys" list lives) so you can
// hop into another game you're in. It does NOT leave the current lobby — that's
// the separate red "Leave" action.

export function BackButton({ label = "Lobbies" }: { label?: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => router.push({ pathname: "/", params: { view: "lobbies" } })}
      activeOpacity={0.8}
      accessibilityLabel="Back to your lobbies"
    >
      <Text style={styles.chevron}>‹</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink800,
    backgroundColor: Colors.bgElevated,
  },
  chevron: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    lineHeight: 20,
    color: Colors.gold500,
    marginRight: 2,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textMuted,
  },
});
