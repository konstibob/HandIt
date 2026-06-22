import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { useFonts } from "expo-font";
import { TitanOne_400Regular } from "@expo-google-fonts/titan-one";
import { Bungee_400Regular } from "@expo-google-fonts/bungee";
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import { Colors } from "../constants/colors";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Family names here must match Fonts.* in src/constants/colors.ts
    TitanOne: TitanOne_400Regular,
    Bungee: Bungee_400Regular,
    Fredoka: Fredoka_400Regular,
    FredokaMedium: Fredoka_500Medium,
    FredokaSemiBold: Fredoka_600SemiBold,
    FredokaBold: Fredoka_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.bgBase }} />;
  }

  return (
    <ConvexProvider client={convex}>
      <Stack screenOptions={{ headerShown: false }} />
    </ConvexProvider>
  );
}
