import { useState } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Colors, Fonts, Radius, Control, Spacing } from "../../constants/colors";

type Variant = "primary" | "secondary";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  style?: ViewStyle;
};

// Hand It — die-cut sticker button. Thick maroon outline + a hard, zero-blur
// offset shadow that "squishes" on press (sinks down 4px, shadow shrinks to 1).
// Mirrors designSystem/components/core/Button.jsx.
export function StickerButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  block = true,
  style,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;

  const tint = variant === "primary" ? Colors.red500 : Colors.gold500;
  const dropColor = variant === "primary" ? Colors.red700 : Colors.gold600;
  const textColor = variant === "primary" ? Colors.textStrong : Colors.ink900;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.btn,
        block && styles.block,
        {
          backgroundColor: isDisabled ? Colors.bone600 : tint,
          shadowColor: isDisabled ? Colors.ink900 : dropColor,
          // Hard offset shadow (no blur). Shrinks toward the surface on press.
          shadowOffset: { width: 0, height: pressed ? 1 : 5 },
          transform: [{ translateY: pressed ? 4 : 0 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: isDisabled ? Colors.textFaint : textColor },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: Control.height,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 3,
    borderColor: Colors.ink800,
    alignItems: "center",
    justifyContent: "center",
    // hard sticker shadow
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  block: {
    width: "100%",
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    letterSpacing: 0.1,
  },
});
