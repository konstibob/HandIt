import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Fonts, Spacing } from "../constants/colors";

// Full-screen "the hunt begins in… 3·2·1·GO!" overlay shown to every player at
// once when the host starts the game, so the swap to the game screen doesn't
// happen abruptly. Each tick pops in; on GO it hands off via onDone.
//
// Change COUNTDOWN_FROM to make the count longer/shorter (e.g. 5 for 5·4·3·2·1).
const COUNTDOWN_FROM = 3;

export function StartCountdown({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Tick down once per second; after GO, hand off.
  useEffect(() => {
    if (count <= 0) {
      const t = setTimeout(onDone, 650);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  // Pop animation on every number (and on GO).
  useEffect(() => {
    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count]);

  const isGo = count <= 0;

  return (
    <SafeAreaView style={styles.overlay}>
      <Text style={styles.kicker}>The hunt begins in…</Text>
      <Animated.Text
        style={[
          styles.number,
          isGo && styles.go,
          { transform: [{ scale }], opacity },
        ]}
      >
        {isGo ? "GO!" : count}
      </Animated.Text>
      <Text style={styles.sub}>Find your target. Trust no handshake.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  kicker: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textFaint,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  number: {
    fontFamily: Fonts.stamp,
    fontSize: 120,
    color: Colors.gold500,
    // Hard stamp shadow
    textShadowColor: Colors.ink900,
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 0,
  },
  go: {
    color: Colors.red500,
    fontSize: 96,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
