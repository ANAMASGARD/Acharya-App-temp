import "react-native-reanimated";
import "../global.css";

import { usePreferencesHydration } from "@/hooks/use-preferences-hydration";
import { isExpoGo } from "@/lib/voice/config";
import { fontAssets } from "@/theme/fonts";
import { colors } from "@/theme/colors";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

SplashScreen.preventAutoHideAsync();

if (!isExpoGo() && Platform.OS !== "web") {
  // Native WebRTC globals — required for EAS / dev builds only (not Expo Go).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerGlobals } = require("@livekit/react-native") as typeof import("@livekit/react-native");
  registerGlobals();
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Copy .env.example to .env and add your Clerk key.",
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  usePreferencesHydration();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <KeyboardProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.cream },
            headerShown: false,
          }}
        />
      </KeyboardProvider>
    </ClerkProvider>
  );
}
