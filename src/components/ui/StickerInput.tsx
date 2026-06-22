import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { Colors, Fonts, Radius, Control, Spacing } from "../../constants/colors";

type Props = TextInputProps & {
  label?: string;
  required?: boolean;
  error?: string | null;
  helper?: string;
  /** Big centered uppercase room-code styling (Bungee). */
  code?: boolean;
};

// Hand It — sunken dark well with a thick sticker outline. Focus lights the
// outline gold (the hilt color). Mirrors designSystem/components/core/Input.jsx.
export function StickerInput({
  label,
  required = false,
  error,
  helper,
  code = false,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const invalid = !!error;

  const borderColor = invalid
    ? Colors.red500
    : focused
      ? Colors.gold500
      : Colors.ink800;

  return (
    <View style={styles.field}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.req}> *</Text>}
        </Text>
      )}
      <TextInput
        placeholderTextColor={Colors.textFaint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          code && styles.code,
          { borderColor },
          // gold focus glow (approximated with a soft shadow on web)
          focused && !invalid && styles.focusGlow,
          style,
        ]}
        {...rest}
      />
      {(error || helper) && (
        <Text style={[styles.help, invalid && styles.helpInvalid]}>
          {error || helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.textBody,
    letterSpacing: 0.1,
  },
  req: {
    color: Colors.red400,
  },
  input: {
    height: Control.height,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgSunken,
    borderWidth: 3,
    borderRadius: Radius.md,
    fontFamily: Fonts.body,
    fontSize: 18,
    color: Colors.textStrong,
  },
  focusGlow: {
    shadowColor: Colors.gold500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
  },
  code: {
    fontFamily: Fonts.stamp,
    fontSize: 26,
    letterSpacing: 6,
    textAlign: "center",
    color: Colors.gold500,
  },
  help: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textFaint,
  },
  helpInvalid: {
    color: Colors.red400,
    fontFamily: Fonts.bodyBold,
  },
});
