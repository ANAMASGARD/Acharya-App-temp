import { AcharyaTabBar } from "@/components/navigation/acharya-tab-bar";
import { TabDataBootstrap } from "@/components/navigation/tab-data-bootstrap";
import { SwipeableTabs } from "@/components/navigation/swipeable-tabs";
import { colors } from "@/theme/colors";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { ActivityIndicator, Dimensions, View } from "react-native";

const TAB_INITIAL_LAYOUT = {
  width: Dimensions.get("window").width,
  height: 0,
};

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
    <>
      <TabDataBootstrap />
      <SwipeableTabs
      initialRouteName="recorder"
      tabBarPosition="bottom"
      initialLayout={TAB_INITIAL_LAYOUT}
      keyboardDismissMode="on-drag"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: false,
      }}
      tabBar={(props: MaterialTopTabBarProps) => <AcharyaTabBar {...props} />}
    >
      <SwipeableTabs.Screen name="index" options={{ title: "Home" }} />
      <SwipeableTabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <SwipeableTabs.Screen name="recorder" options={{ title: "Recorder" }} />
      <SwipeableTabs.Screen name="chat" options={{ title: "Chat" }} />
      <SwipeableTabs.Screen name="profile" options={{ title: "Profile" }} />
    </SwipeableTabs>
    </>
  );
}
