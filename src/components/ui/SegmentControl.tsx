import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Fonts, Radius, Spacing } from "../../constants/colors";

// Pill-style segmented tab control. Extracted from the inline segmented control
// on the home screen so it can drive the in-game tabs too. The active segment
// is a solid red pill.

export type SegmentOption<K extends string> = {
  key: K;
  label: string;
};

type Props<K extends string> = {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
};

export function SegmentControl<K extends string>({
  options,
  value,
  onChange,
}: Props<K>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.btn, active && styles.btnActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    backgroundColor: Colors.bgSunken,
    borderWidth: 3,
    borderColor: Colors.ink900,
    borderRadius: Radius.pill,
    padding: 4,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: Colors.red500,
  },
  text: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  textActive: {
    color: Colors.textStrong,
  },
});
