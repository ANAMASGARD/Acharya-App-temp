import { AcharyaTabBar } from "@/components/navigation/acharya-tab-bar";
import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/theme/colors";

export default function TabsLayout(): React.ReactElement | null {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.foreground} size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      initialRouteName="recorder"
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <AcharyaTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="recorder" options={{ title: "Recorder" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
