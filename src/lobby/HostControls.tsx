import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Colors, Fonts, Spacing, Sticker } from "../constants/colors";

type Props = {
  onStartGame: () => void;
  isLoading: boolean;
  playerCount: number;
};

const MIN_PLAYERS = 3;

export function HostControls({ onStartGame, isLoading, playerCount }: Props) {
  const canStart = playerCount >= MIN_PLAYERS;

  return (
    <View style={styles.container}>
      {!canStart && (
        <Text style={styles.hint}>
          Need at least {MIN_PLAYERS} players to start
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, (!canStart || isLoading) && styles.buttonDisabled]}
        onPress={onStartGame}
        disabled={!canStart || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.textStrong} />
        ) : (
          <Text style={styles.buttonText}>Start Game</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textFaint,
    textAlign: "center",
  },
  button: {
    backgroundColor: Colors.red500,
    borderWidth: Sticker.borderWidth,
    borderColor: Colors.ink900,
    borderRadius: 999,
    paddingVertical: Spacing.sm + 4,
    alignItems: "center",
    shadowColor: Colors.red600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textStrong,
    letterSpacing: 0.5,
  },
});
