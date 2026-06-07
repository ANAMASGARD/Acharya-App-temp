import { colors } from "@/theme/colors";
import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function AuthLayout(): React.ReactElement | null {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)/recorder" />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.cream },
        headerShown: false,
      }}
    />
  );
}
