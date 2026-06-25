import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Colors, Fonts, Radius, Spacing, Sticker } from "../../constants/colors";

// A slight pop-up that slides down from the top edge, sits briefly, then slides
// away. Self-dismissing: after HOLD_MS it animates out and calls onHide so the
// parent can drop it from the tree. Mount it (keyed) when you want it to show.
const HOLD_MS = 2500;

export function Toast({
  message,
  onHide,
}: {
  message: string;
  onHide: () => void;
}) {
  const translateY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide + fade in (gentle).
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Hold, then slide + fade out and hand back.
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -16,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.toast, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: Spacing.md,
    alignSelf: "center",
    zIndex: 100,
    backgroundColor: Colors.bgElevated,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.gold500,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    // Hard sticker shadow
    shadowColor: Colors.ink900,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  text: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textStrong,
  },
});
