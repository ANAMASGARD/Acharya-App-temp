import { colors } from "@/theme/colors";
import { Stack } from "expo-router";

export default function ProfileStackLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.cream },
        headerShown: false,
      }}
    />
  );
}
