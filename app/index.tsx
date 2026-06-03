import { useLanguageGate } from "@/hooks/use-language-gate";
import {
  clearPreferencesStorage,
  usePreferencesStore,
} from "@/store/preferences-store";
import { colors } from "@/theme/colors";
import { borderWidths, spacing } from "@/theme/tokens";
import { fontFamilies } from "@/theme/typography";
import { useAuth } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { isReady, needsLanguageSelection, selectedLanguage } =
    useLanguageGate();
  const clearLanguagePreference = usePreferencesStore(
    (state) => state.clearLanguagePreference,
  );

  const handleClearStorageForTesting = async (): Promise<void> => {
    clearLanguagePreference();
    await clearPreferencesStorage();
    router.replace("/language");
  };

  if (!isLoaded || !isReady) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.foreground} size="large" />
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  if (needsLanguageSelection) {
    return <Redirect href="/language" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center font-head text-[34px] leading-[40px] text-foreground">
          Welcome to Acharya
        </Text>
        <Text className="mt-4 max-w-[300px] text-center font-sans text-[15px] leading-[22px] text-muted-foreground">
          Your teaching assistant is ready. Home dashboard coming soon.
        </Text>
        {selectedLanguage ? (
          <Text className="mt-2 text-center font-sans text-[13px] text-muted-foreground">
            Teaching language: {selectedLanguage.nameEnglish} (
            {selectedLanguage.nameNative})
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change teaching language"
          className="mt-8 neo-button-secondary min-h-[48px] items-center justify-center px-6 shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          onPress={() => router.push("/language")}
        >
          <Text className="font-sans-bold text-[15px] text-foreground">
            Change teaching language
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear storage for testing language selection"
          onPress={() => void handleClearStorageForTesting()}
          style={styles.testClearButton}
        >
          <Text style={styles.testClearText}>
            Clear storage (test language gate)
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  testClearButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: borderWidths.thin,
    borderColor: colors.destructive,
  },
  testClearText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    color: colors.destructive,
    textAlign: "center",
  },
});
