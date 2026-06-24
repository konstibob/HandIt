import { StyleSheet, Text, View } from "react-native";
import { Colors, Fonts, Radius } from "../../constants/colors";

// Small pill badge (port of the design system's Badge). Used for HOST/YOU tags
// and Alive/Out status. `dot` prepends a small status dot; the dead variant
// uses a dashed outline to echo the dead-avatar ring.

export type BadgeVariant = "gold" | "neutral" | "red" | "alive" | "dead";

type Props = {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
};

type VariantStyle = {
  bg: string;
  fg: string;
  border: string;
  dashed?: boolean;
};

const VARIANTS: Record<BadgeVariant, VariantStyle> = {
  gold: { bg: Colors.gold500, fg: Colors.ink900, border: Colors.ink800 },
  neutral: { bg: Colors.bgElevated, fg: Colors.textMuted, border: Colors.ink800 },
  red: { bg: Colors.red500, fg: Colors.textStrong, border: Colors.ink800 },
  alive: { bg: Colors.bgElevated, fg: Colors.alive, border: Colors.alive },
  dead: { bg: Colors.bgElevated, fg: Colors.textFaint, border: Colors.bone600, dashed: true },
};

export function Badge({ label, variant = "neutral", dot = false }: Props) {
  const v = VARIANTS[variant];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderStyle: v.dashed ? "dashed" : "solid",
        },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: v.fg }]} />}
      <Text style={[styles.text, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 2,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  text: {
    fontFamily: Fonts.stamp,
    fontSize: 10,
    letterSpacing: 1,
  },
});
