import { colors } from "@/theme/colors";
import { Stack } from "expo-router";

export default function CommunityLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.cream },
      }}
    />
  );
}
