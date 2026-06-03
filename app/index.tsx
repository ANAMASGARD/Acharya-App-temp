import { useLanguageGate } from "@/hooks/use-language-gate";
import { colors } from "@/theme/colors";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IndexGate(): React.ReactElement {
  const { isLoaded, isSignedIn } = useAuth();
  const { isReady, needsLanguageSelection } = useLanguageGate();

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

  return <Redirect href="/(tabs)" />;
}
