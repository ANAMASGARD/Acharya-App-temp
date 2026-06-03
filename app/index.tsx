import { colors } from "@/theme/colors";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen(): React.ReactElement {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
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
      </View>
    </SafeAreaView>
  );
}
